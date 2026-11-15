import { photoAccessHelper } from '@kit.MediaLibraryKit';
import { dataSharePredicates } from '@kit.ArkData';
import { common, abilityAccessCtrl, Permissions } from '@kit.AbilityKit';
import { fileIo as fs } from '@kit.CoreFileKit';
import { image } from '@kit.ImageKit';

export interface Album { id: string; name: string; storageName?: string; sourcePaths?: string[] }
export interface History { id: string; before: string; after: string; moved: boolean; location?: string }
export interface UIState { assignments: Record<string, string>; albums: Album[]; history: History[]; gridColumns?: number }
export interface MediaItem { id: string; name: string; date: number; kind: string; source: string; url: string; thumb: string }
export interface Capabilities { nativeVideo: boolean; systemTrash: boolean; folderMode: string }
export interface Scan { items: MediaItem[]; platform: string; capabilities: Capabilities; warning: string }
export interface Access { scope: string; visible: number; ready: boolean; fullAccess: boolean }
export interface Args { state?: UIState; id?: string; ids?: string[]; albumId?: string; folder?: string; location?: string }
export interface MoveResult { previous: string; moved: boolean }
export interface TrashResult { done: string[]; warning: string }
export interface ItemFailure { id: string; error: string }
export interface DissolveResult extends Scan { state: UIState; done: string[]; failures: ItemFailure[]; removed: boolean }
interface Stored { ui: UIState; selected: string[] }
export function mediaMime(name: string): string {
  const formats: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', avif: 'image/avif', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff' };
  const parts = name.toLowerCase().split('.'); return formats[parts[parts.length - 1]] || 'application/octet-stream';
}

// HarmonyOS 5 public APIs cannot create/delete system albums or restore the system trash.
// Keep categories in the local index; never use a file unlink operation on a media URI.
export class PhotoLibrary {
  ui: UIState = { assignments: {}, albums: [], history: [] };
  selected: string[] = [];
  assets: Map<string, photoAccessHelper.PhotoAsset> = new Map<string, photoAccessHelper.PhotoAsset>();
  helper: photoAccessHelper.PhotoAccessHelper;
  private store: string;
  context: common.UIAbilityContext;
  constructor(context: common.UIAbilityContext) {
    this.context = context;
    this.helper = photoAccessHelper.getPhotoAccessHelper(context);
    this.store = context.filesDir + '/library.json';
    if (fs.accessSync(this.store)) {
      const parsed = JSON.parse(fs.readTextSync(this.store)) as Stored;
      if (!parsed.ui || !parsed.selected) { throw new Error('相册索引损坏，请保留应用数据后恢复备份'); }
      this.ui = parsed.ui; this.selected = parsed.selected;
    }
  }
  save(): void {
    const content: Stored = { ui: this.ui, selected: this.selected };
    const file = fs.openSync(this.store + '.tmp', fs.OpenMode.CREATE | fs.OpenMode.WRITE_ONLY | fs.OpenMode.TRUNC);
    try { fs.writeSync(file.fd, JSON.stringify(content)); fs.fsyncSync(file.fd); } finally { fs.closeSync(file); }
    fs.renameSync(this.store + '.tmp', this.store);
  }
  permitted(permission: Permissions): boolean {
    return abilityAccessCtrl.createAtManager().checkAccessTokenSync(this.context.applicationInfo.accessTokenId, permission) === abilityAccessCtrl.GrantStatus.PERMISSION_GRANTED;
  }
  async fetch(uri?: string): Promise<photoAccessHelper.PhotoAsset[]> {
    const predicates = new dataSharePredicates.DataSharePredicates();
    if (uri) { predicates.equalTo(photoAccessHelper.PhotoKeys.URI, uri); }
    const result = await this.helper.getAssets({ fetchColumns: [photoAccessHelper.PhotoKeys.DISPLAY_NAME, photoAccessHelper.PhotoKeys.DATE_TAKEN], predicates: predicates });
    try { return await result.getAllObjects(); } finally { result.close(); }
  }
  async scan(): Promise<Scan> {
    const next = new Map<string, photoAccessHelper.PhotoAsset>();
    let warning = '鸿蒙分类仅保存在拾光本机。系统回收项目请到系统相册的最近删除中恢复。';
    if (this.permitted('ohos.permission.READ_IMAGEVIDEO')) {
      const assets = await this.fetch(); assets.forEach(a => { next.set(a.uri, a); });
    } else {
      let missing = 0;
      for (const uri of this.selected) {
        try { const assets = await this.fetch(uri); assets.forEach(a => { next.set(a.uri, a); }); }
        catch { missing++; }
      }
      if (missing) { warning += ' 部分项目当前无访问权限，请重新选择补充授权；分类记录保留。'; }
    }
    this.assets = next;
    const items: MediaItem[] = [];
    next.forEach(a => {
      const name = a.get(photoAccessHelper.PhotoKeys.DISPLAY_NAME) as string;
      const taken = a.get(photoAccessHelper.PhotoKeys.DATE_TAKEN) as number;
      const id = encodeURIComponent(a.uri);
      items.push({ id: id, name: name, date: taken > 100000000000 ? taken : taken * 1000, kind: a.photoType === photoAccessHelper.PhotoType.VIDEO ? 'video' : name.toLowerCase().endsWith('.gif') ? 'gif' : 'image', source: '所选本机媒体', url: 'https://media.local/' + id, thumb: 'https://media.local/' + id + '?thumb=1' });
    });
    return { items: items, platform: 'harmony', capabilities: { nativeVideo: true, systemTrash: false, folderMode: 'virtual' }, warning: warning };
  }
  async select(): Promise<Scan> {
    const picker = new photoAccessHelper.PhotoViewPicker();
    const result = await picker.select({ MIMEType: photoAccessHelper.PhotoViewMIMETypes.IMAGE_VIDEO_TYPE, maxSelectNumber: 500 });
    const before = this.selected.slice();
    for (const uri of result.photoUris) { if (!this.selected.includes(uri)) { this.selected.push(uri); } }
    try { this.save(); } catch (error) { this.selected = before; throw error; }
    return this.scan();
  }
  access(): Access {
    const full = this.permitted('ohos.permission.READ_IMAGEVIDEO');
    return { scope: full ? 'all' : this.assets.size ? 'partial' : 'none', visible: this.assets.size, ready: full || this.assets.size > 0, fullAccess: full };
  }
  asset(id: string): photoAccessHelper.PhotoAsset {
    const asset = this.assets.get(decodeURIComponent(id));
    if (!asset) { throw new Error('照片不在当前授权范围，请刷新或重新选择'); } return asset;
  }
  async thumbnail(id: string): Promise<ArrayBuffer> {
    const pixel = await this.asset(id).getThumbnail({ width: 600, height: 600 });
    const packer = image.createImagePacker();
    try { return await packer.packing(pixel, { format: 'image/jpeg', quality: 85 }); }
    finally { await pixel.release(); await packer.release(); }
  }
  async dissolve(id: string): Promise<DissolveResult> {
    if (!this.ui.albums.some(a => a.id === id)) { throw new Error('分类已不存在'); }
    const before = JSON.stringify(this.ui), done: string[] = [];
    Object.keys(this.ui.assignments).forEach(key => { if (this.ui.assignments[key] === id) { this.ui.assignments[key] = 'pending'; done.push(key); } });
    this.ui.albums = this.ui.albums.filter(a => a.id !== id);
    this.ui.history = this.ui.history.filter(h => h.before !== id && h.after !== id && !done.includes(h.id));
    try { this.save(); } catch (error) { this.ui = JSON.parse(before) as UIState; throw error; }
    const result = await this.scan();
    return { items: result.items, platform: result.platform, capabilities: result.capabilities, warning: result.warning, state: this.ui, done: done, failures: [], removed: true };
  }
  async trash(ids: string[]): Promise<TrashResult> {
    // WRITE_IMAGEVIDEO requires the corresponding permission/ACL. On denial retain the pending-delete index.
    if (!this.permitted('ohos.permission.WRITE_IMAGEVIDEO')) {
      const result = await abilityAccessCtrl.createAtManager().requestPermissionsFromUser(this.context, ['ohos.permission.WRITE_IMAGEVIDEO']);
      if (result.authResults.some(status => status !== 0)) { throw new Error('系统未授予媒体清理权限，待删除项目保留。该权限可能需要开发者申请 ACL。'); }
    }
    const uris: string[] = ids.map(id => this.asset(id).uri);
    await photoAccessHelper.MediaAssetChangeRequest.deleteAssets(this.context, uris);
    // A successful public API call requests the system trash; do not substitute fs.unlink.
    return { done: ids, warning: '已请求系统回收。恢复请在系统相册的最近删除中进行；仍需真机确认厂商展示行为。' };
  }
  release(): void { this.helper.release(); }
}
