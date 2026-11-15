import { webview } from '@kit.ArkWeb';
import { common } from '@kit.AbilityKit';
import { fileIo as fs } from '@kit.CoreFileKit';
import { PhotoLibrary, Args, UIState, Scan, Access, MoveResult, TrashResult, DissolveResult, mediaMime } from '../bridge/PhotoLibrary';

type Reply = UIState | Scan | Access | MoveResult | TrashResult | DissolveResult | boolean;
class NativeBridge {
  private library: PhotoLibrary;
  private controller: webview.WebviewController;
  private preview: (uri: string, video: boolean) => void;
  constructor(library: PhotoLibrary, controller: webview.WebviewController, preview: (uri: string, video: boolean) => void) { this.library = library; this.controller = controller; this.preview = preview; }
  call(id: number, method: string, json: string): void { this.execute(id, method, json); }
  async execute(id: number, method: string, json: string): Promise<void> {
    try {
      const args = JSON.parse(json) as Args;
      const result = await this.dispatch(method, args);
      await this.controller.runJavaScript('window.nativeResult(' + id + ',' + JSON.stringify(result) + ',null)');
    } catch (error) {
      const message = (error as Error).message || '操作未完成，原文件保留';
      await this.controller.runJavaScript('window.nativeResult(' + id + ',null,' + JSON.stringify(message) + ')');
    }
  }
  async dispatch(method: string, args: Args): Promise<Reply> {
    switch (method) {
      case 'load': return this.library.ui;
      case 'save': {
        if (!args.state) { throw new Error('无效索引'); }
        const before = this.library.ui; this.library.ui = args.state;
        try { this.library.save(); } catch (error) { this.library.ui = before; throw error; } return true;
      }
      case 'scan': return this.library.scan();
      case 'import': return this.library.select();
      case 'mediaAccess': return this.library.access();
      case 'openPhotoSettings':
        await this.library.context.startAbility({ action: 'ohos.settings.appInfo', parameters: { settingsParamBundleName: this.library.context.abilityInfo.bundleName } });
        return this.library.scan();
      case 'move': this.library.asset(args.id || ''); return { previous: '', moved: false };
      case 'restore': return true;
      case 'dissolveAlbum': return this.library.dissolve(args.albumId || '');
      case 'trash': return this.library.trash(args.ids || []);
      case 'playVideo': this.preview(this.library.asset(args.id || '').uri, true); return true;
      case 'open': { const asset = this.library.asset(args.id || ''); this.preview(asset.uri, asset.photoType === 2); return true; }
      default: throw new Error('此系统未开放该功能，原文件保留');
    }
  }
}

@Entry
@Component
struct Index {
  private controller: webview.WebviewController = new webview.WebviewController();
  private player: VideoController = new VideoController();
  private library?: PhotoLibrary;
  private bridge?: NativeBridge;
  @State previewUri: string = '';
  @State isVideo: boolean = false;
  @State startupError: string = '';
  aboutToAppear(): void {
    try {
      this.library = new PhotoLibrary(getContext(this) as common.UIAbilityContext);
      this.bridge = new NativeBridge(this.library, this.controller, (uri: string, video: boolean) => { this.isVideo = video; this.previewUri = uri; });
    } catch (error) { this.startupError = (error as Error).message; }
  }
  aboutToDisappear(): void { this.library?.release(); }
  onBackPress(): boolean {
    if (this.previewUri) { if (this.isVideo) { this.player.pause(); } this.previewUri = ''; return true; }
    this.controller.runJavaScript("(()=>{const d=[...document.querySelectorAll('dialog[open]')].at(-1);if(!d)return false;if(d.id==='viewer')closeViewer();else d.close();return true;})()").then(result => { if (result === 'false') { (getContext(this) as common.UIAbilityContext).terminateSelf(); } });
    return true;
  }
  build() {
    Stack() {
      if (this.startupError) { Text(this.startupError).padding(24) }
      else {
        Web({ src: $rawfile('web/index.html'), controller: this.controller })
          .javaScriptAccess(true)
          .domStorageAccess(false)
          .javaScriptProxy({ object: this.bridge!, name: 'Native', methodList: ['call'], controller: this.controller })
          .onLoadIntercept(event => { if (!event) { return true; } return !event.data.getRequestUrl().toLowerCase().startsWith('resource://'); })
          .onInterceptRequest(event => {
            if (!event) { return null; }
            const url = event.request.getRequestUrl();
            if (!url.startsWith('https://media.local/')) { return null; }
            const response = new WebResourceResponse();
            response.setResponseIsReady(false);
            response.setResponseCode(200); response.setReasonMessage('OK');
            const suffix = url.substring('https://media.local/'.length), id = suffix.split('?')[0];
            if (suffix.includes('?thumb=1')) {
              response.setResponseMimeType('image/jpeg');
              this.library!.thumbnail(id).then(data => { response.setResponseData(data); response.setResponseIsReady(true); }).catch(() => { response.setResponseCode(404); response.setResponseData(''); response.setResponseIsReady(true); });
            } else {
              try {
                const asset = this.library!.asset(id);
                const file = fs.openSync(asset.uri, fs.OpenMode.READ_ONLY);
                // ArkWeb owns and closes a response file descriptor (official WebResourceResponse contract).
                response.setResponseData(file.fd); response.setResponseMimeType(mediaMime(asset.displayName)); response.setResponseIsReady(true);
              } catch { response.setResponseCode(404); response.setResponseData(''); response.setResponseIsReady(true); }
            }
            return response;
          })
          .visibility(this.previewUri ? Visibility.Hidden : Visibility.Visible)
      }
      if (this.previewUri) {
        Column() {
          Row() { Button('‹ 返回整理').onClick(() => { if (this.isVideo) { this.player.pause(); } this.previewUri = ''; }) }.width('100%').padding(12)
          if (this.isVideo) { Video({ src: this.previewUri, controller: this.player }).controls(true).autoPlay(true).objectFit(ImageFit.Contain).layoutWeight(1).onError(() => { this.startupError = '当前系统无法解码此视频；原文件保留'; this.previewUri = ''; }) }
          else { Image(this.previewUri).objectFit(ImageFit.Contain).layoutWeight(1).width('100%') }
        }.width('100%').height('100%').backgroundColor('#101811')
      }
    }.width('100%').height('100%').backgroundColor('#f7f9f6')
  }
}
