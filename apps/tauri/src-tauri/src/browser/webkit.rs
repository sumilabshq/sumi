use block2::RcBlock;
use objc2::rc::Retained;
use objc2::runtime::{AnyObject, Bool};
use objc2::{class, msg_send, AllocAnyThread, MainThreadMarker};
use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep, NSImage};
use objc2_core_foundation::{CGFloat, CGPoint, CGRect, CGSize};
use objc2_foundation::{NSBundle, NSData, NSDictionary, NSError, NSString};
use objc2_web_kit::{WKContentWorld, WKFrameInfo, WKPDFConfiguration, WKSnapshotConfiguration, WKWebView};
use serde_json::{json, Value};

pub const INK_WORLD: &str = "widgetarium-ink";
pub const NOT_ON_MAIN_THREAD: &str = "WebKit was asked from outside the main thread.";
pub const NO_SNAPSHOT: &str = "The page gave no picture of itself.";
pub const NOT_TEXT: &str = "The page answered something that is not text.";

pub struct ShotRegion {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

pub enum ShotFormat {
    Png,
    Jpeg,
}

pub type Answer<T> = Result<T, String>;

const SAFARI_BUNDLE: &str = "/Applications/Safari.app";
const SHORT_VERSION_KEY: &str = "CFBundleShortVersionString";

pub fn safari_version() -> Option<String> {
    let bundle = NSBundle::bundleWithPath(&NSString::from_str(SAFARI_BUNDLE))?;
    let version = bundle.objectForInfoDictionaryKey(&NSString::from_str(SHORT_VERSION_KEY))?;
    version.downcast::<NSString>().ok().map(|text| text.to_string())
}

pub fn view_of(platform: &tauri::webview::PlatformWebview) -> &WKWebView {
    unsafe { &*(platform.inner() as *const WKWebView) }
}

fn text_of(held: Option<Retained<NSString>>) -> String {
    held.map(|text| text.to_string()).unwrap_or_default()
}

pub fn facts_of(view: &WKWebView) -> Value {
    let url = unsafe { view.URL() }.and_then(|url| url.absoluteString());
    json!({
        "url": text_of(url),
        "title": text_of(unsafe { view.title() }),
        "canGoBack": unsafe { view.canGoBack() },
        "canGoForward": unsafe { view.canGoForward() },
        "isLoading": unsafe { view.isLoading() },
    })
}

pub fn go_back(view: &WKWebView) {
    let _ = unsafe { view.goBack() };
}

pub fn go_forward(view: &WKWebView) {
    let _ = unsafe { view.goForward() };
}

pub fn reload(view: &WKWebView) {
    let _ = unsafe { view.reload() };
}

const LEFT_SIDE: u8 = 1;
const RIGHT_SIDE: u8 = 2;
const MIN_X_MIN_Y: usize = 1;
const MAX_X_MIN_Y: usize = 2;
const MIN_X_MAX_Y: usize = 4;
const MAX_X_MAX_Y: usize = 8;

const DARK_APPEARANCE: &str = "NSAppearanceNameDarkAqua";
const LIGHT_APPEARANCE: &str = "NSAppearanceNameAqua";

pub fn wear_appearance(view: &WKWebView, is_dark: bool) {
    let name = NSString::from_str(if is_dark { DARK_APPEARANCE } else { LIGHT_APPEARANCE });
    let appearance: *mut AnyObject = unsafe { msg_send![class!(NSAppearance), appearanceNamed: &*name] };
    let _: () = unsafe { msg_send![view, setAppearance: appearance] };
}

pub fn round_bottom_corners(view: &WKWebView, radius: f64, sides: u8) {
    let _: () = unsafe { msg_send![view, setWantsLayer: Bool::YES] };
    let layer: *mut AnyObject = unsafe { msg_send![view, layer] };
    let Some(layer) = (unsafe { layer.as_ref() }) else { return };
    let is_flipped: Bool = unsafe { msg_send![layer, isGeometryFlipped] };
    let (left, right) = if is_flipped.as_bool() { (MIN_X_MAX_Y, MAX_X_MAX_Y) } else { (MIN_X_MIN_Y, MAX_X_MIN_Y) };
    let bottom = (if sides & LEFT_SIDE != 0 { left } else { 0 }) | (if sides & RIGHT_SIDE != 0 { right } else { 0 });
    let _: () = unsafe { msg_send![layer, setCornerRadius: radius as CGFloat] };
    let _: () = unsafe { msg_send![layer, setMaskedCorners: bottom] };
    let _: () = unsafe { msg_send![layer, setMasksToBounds: Bool::YES] };
}

fn main_thread() -> Answer<MainThreadMarker> {
    MainThreadMarker::new().ok_or_else(|| NOT_ON_MAIN_THREAD.to_string())
}

fn encoded(image: &NSImage, format: &ShotFormat) -> Answer<Vec<u8>> {
    let tiff = image.TIFFRepresentation().ok_or(NO_SNAPSHOT)?;
    let bitmap = NSBitmapImageRep::imageRepWithData(&tiff).ok_or(NO_SNAPSHOT)?;
    let kind = match format {
        ShotFormat::Png => NSBitmapImageFileType::PNG,
        ShotFormat::Jpeg => NSBitmapImageFileType::JPEG,
    };
    let properties: Retained<NSDictionary<NSString, AnyObject>> = NSDictionary::new();
    let data = unsafe { bitmap.representationUsingType_properties(kind, &properties) };
    data.map(|bytes| bytes.to_vec()).ok_or_else(|| NO_SNAPSHOT.to_string())
}

fn failure_text(error: *mut NSError, fallback: &str) -> String {
    unsafe { error.as_ref() }.map(|error| error.localizedDescription().to_string()).unwrap_or_else(|| fallback.into())
}

pub fn snapshot(
    view: &WKWebView,
    region: Option<ShotRegion>,
    format: ShotFormat,
    done: impl Fn(Answer<Vec<u8>>) + 'static,
) -> Answer<()> {
    let configuration = unsafe { WKSnapshotConfiguration::new(main_thread()?) };
    unsafe { configuration.setAfterScreenUpdates(false) };

    if let Some(region) = region {
        let rect = CGRect::new(CGPoint::new(region.x, region.y), CGSize::new(region.width, region.height));
        unsafe { configuration.setRect(rect) };
    }

    let answered = RcBlock::new(move |image: *mut NSImage, error: *mut NSError| {
        let shot = unsafe { image.as_ref() }.ok_or_else(|| failure_text(error, NO_SNAPSHOT));
        done(shot.and_then(|image| encoded(image, &format)));
    });
    unsafe { view.takeSnapshotWithConfiguration_completionHandler(Some(&configuration), &answered) };
    Ok(())
}

pub fn page_shot(view: &WKWebView, region: Option<ShotRegion>, done: impl Fn(Answer<Vec<u8>>) + 'static) -> Answer<()> {
    let configuration = unsafe { WKPDFConfiguration::new(main_thread()?) };

    if let Some(region) = region {
        let rect = CGRect::new(CGPoint::new(region.x, region.y), CGSize::new(region.width, region.height));
        unsafe { configuration.setRect(rect) };
    }

    let answered = RcBlock::new(move |pdf: *mut NSData, error: *mut NSError| {
        let drawn = unsafe { pdf.as_ref() }.ok_or_else(|| failure_text(error, NO_SNAPSHOT));
        done(drawn.and_then(png_of_pdf));
    });
    unsafe { view.createPDFWithConfiguration_completionHandler(Some(&configuration), &answered) };
    Ok(())
}

fn png_of_pdf(pdf: &NSData) -> Answer<Vec<u8>> {
    let image = NSImage::initWithData(NSImage::alloc(), pdf).ok_or(NO_SNAPSHOT)?;
    encoded(&image, &ShotFormat::Png)
}

fn ink_world(mtm: MainThreadMarker) -> Retained<WKContentWorld> {
    unsafe { WKContentWorld::worldWithName(&NSString::from_str(INK_WORLD), mtm) }
}

fn text_answer(answer: *mut AnyObject, error: *mut NSError) -> Answer<String> {
    if !error.is_null() {
        return Err(failure_text(error, NOT_TEXT));
    }

    let held = unsafe { answer.as_ref() }.ok_or(NOT_TEXT)?;
    held.downcast_ref::<NSString>().map(|text| text.to_string()).ok_or_else(|| NOT_TEXT.to_string())
}

pub fn evaluate_isolated(
    view: &WKWebView,
    script: &str,
    frame: Option<&WKFrameInfo>,
    done: impl Fn(Answer<String>) + 'static,
) -> Answer<()> {
    let world = ink_world(main_thread()?);
    let answered = RcBlock::new(move |answer: *mut AnyObject, error: *mut NSError| done(text_answer(answer, error)));
    unsafe {
        view.evaluateJavaScript_inFrame_inContentWorld_completionHandler(
            &NSString::from_str(script),
            frame,
            &world,
            Some(&answered),
        )
    };
    Ok(())
}
