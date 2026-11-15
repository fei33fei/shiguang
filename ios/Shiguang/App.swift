import UIKit
import WebKit
import Photos
import AVKit
import QuickLook

@main final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = AlbumController(); window.makeKeyAndVisible(); self.window = window
        return true
    }
}

func failure(_ message: String) -> NSError { NSError(domain: "Shiguang", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
func mediaID(_ value: String) -> String { Data(value.utf8).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "") }
func assetID(_ value: String) -> String {
    var s = value.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    s += String(repeating: "=", count: (4 - s.count % 4) % 4)
    return String(data: Data(base64Encoded: s) ?? Data(), encoding: .utf8) ?? ""
}

// This adapter uses PhotoKit album membership. It never edits the Photos library on disk.
@MainActor final class PhotoLibrary {
    var ui: [String: Any] = ["assignments": [:], "albums": [], "history": []]
    var managed: [String: String] = [:], placements: [String: String] = [:], sources: [String: String] = [:]
    let store: URL
    init() throws {
        let root = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        store = root.appendingPathComponent("library.json")
        if FileManager.default.fileExists(atPath: store.path) {
            guard let saved = try JSONSerialization.jsonObject(with: Data(contentsOf: store)) as? [String: Any], let state = saved["ui"] as? [String: Any] else { throw failure("相册索引损坏，请保留应用数据后恢复备份") }
            ui = state; managed = saved["managed"] as? [String: String] ?? [:]; placements = saved["placements"] as? [String: String] ?? [:]
        }
    }
    func save() throws { try JSONSerialization.data(withJSONObject: ["ui": ui, "managed": managed, "placements": placements]).write(to: store, options: .atomic) }
    func asset(_ id: String) throws -> PHAsset {
        guard let a = PHAsset.fetchAssets(withLocalIdentifiers: [assetID(id)], options: nil).firstObject else { throw failure("照片已不在当前授权范围，请刷新或补充访问权限") }; return a
    }
    func collection(_ id: String) -> PHAssetCollection? { PHAssetCollection.fetchAssetCollections(withLocalIdentifiers: [id], options: nil).firstObject }
    func placement(_ id: String) -> String {
        if let existing = placements[id] { return existing }
        let assignments = ui["assignments"] as? [String: String] ?? [:]
        let albums = ui["albums"] as? [[String: Any]] ?? []
        if let album = albums.first(where: { $0["id"] as? String == assignments[id] }), let key = (album["sourcePaths"] as? [String])?.first { return sources[key] ?? "" }
        return ""
    }
    func authorize() async { _ = await PHPhotoLibrary.requestAuthorization(for: .readWrite) }
    func changes(_ block: @escaping () -> Void) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            PHPhotoLibrary.shared().performChanges(block) { ok, error in
                if ok { continuation.resume() } else { continuation.resume(throwing: error ?? failure("系统未批准修改，原记录保留")) }
            }
        }
    }
    func access() -> [String: Any] {
        let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        let count = PHAsset.fetchAssets(with: nil).count
        return ["scope": status == .authorized ? "all" : status == .limited ? "partial" : "none", "visible": count, "ready": status == .authorized || status == .limited, "fullAccess": status == .authorized]
    }
    func scan() -> [String: Any] {
        var sourceByID: [String: String] = [:]; sources = [:]
        let albums = PHAssetCollection.fetchAssetCollections(with: .album, subtype: .any, options: nil)
        albums.enumerateObjects { album, _, _ in
            let key = "相册/\(album.localizedTitle ?? "未命名") · \(album.localIdentifier.prefix(8))"
            self.sources[key] = album.localIdentifier
            let assets = PHAsset.fetchAssets(in: album, options: nil)
            assets.enumerateObjects { a, _, _ in if sourceByID[a.localIdentifier] == nil { sourceByID[a.localIdentifier] = key } }
        }
        var items: [[String: Any]] = []
        PHAsset.fetchAssets(with: nil).enumerateObjects { a, _, _ in
            let resource = PHAssetResource.assetResources(for: a).first
            let id = mediaID(a.localIdentifier), name = resource?.originalFilename ?? "照片"
            let kind = a.mediaType == .video ? "video" : name.lowercased().hasSuffix(".gif") ? "gif" : "image"
            items.append(["id": id, "name": name, "date": (a.creationDate ?? a.modificationDate ?? Date()).timeIntervalSince1970 * 1000, "kind": kind, "source": sourceByID[a.localIdentifier] ?? "系统照片图库", "url": "media://local/\(id)", "thumb": "media://local/\(id)?thumb=1"])
        }
        return ["items": items, "platform": "ios", "capabilities": ["nativeVideo": true, "systemTrash": false, "folderMode": "album"], "warning": "iPhone 使用系统相册成员关系；清理后的照片请到 Apple 照片的‘最近删除’恢复。云端未下载的原片不会自动下载。"]
    }
    func target(_ name: String, source: String?) async throws -> String {
        if let source = source, let id = sources[source], collection(id) != nil { return id }
        if let id = managed[name], collection(id) != nil { return id }
        var identifier: String?
        try await changes { identifier = PHAssetCollectionChangeRequest.creationRequestForAssetCollection(withTitle: name).placeholderForCreatedAssetCollection.localIdentifier }
        guard let id = identifier else { throw failure("未能创建系统相册") }; managed[name] = id; try save(); return id
    }
    func transfer(_ id: String, to next: String) async throws {
        let a = try asset(id), old = placement(id)
        if old == next { return }
        let from = collection(old), to = collection(next)
        if !next.isEmpty && to == nil { throw failure("目标相册已不存在") }
        try await changes {
            if let to = to { PHAssetCollectionChangeRequest(for: to)?.addAssets([a] as NSArray) }
            if let from = from { PHAssetCollectionChangeRequest(for: from)?.removeAssets([a] as NSArray) }
        }
        placements[id] = next
        do { try save() } catch {
            // Roll back the membership if the local index could not be persisted.
            try await changes {
                if let from = from { PHAssetCollectionChangeRequest(for: from)?.addAssets([a] as NSArray) }
                if let to = to { PHAssetCollectionChangeRequest(for: to)?.removeAssets([a] as NSArray) }
            }
            placements[id] = old; throw error
        }
    }
    func move(_ args: [String: Any]) async throws -> [String: Any] {
        guard let id = args["id"] as? String else { throw failure("缺少照片") }
        let previous = placement(id)
        guard let folder = args["folder"] as? String else { return ["previous": previous, "moved": false] }
        let next = try await target(folder, source: args["targetPath"] as? String)
        try await transfer(id, to: next); return ["previous": previous, "moved": previous != next]
    }
    func dissolve(_ albumID: String) async throws -> [String: Any] {
        var assignments = ui["assignments"] as? [String: String] ?? [:]
        let ids = assignments.filter { $0.value == albumID }.map(\.key)
        var done: [String] = [], failures: [[String: String]] = []
        for id in ids {
            do { try await transfer(id, to: ""); assignments[id] = "pending"; done.append(id); ui["assignments"] = assignments; try save() }
            catch { failures.append(["id": id, "error": error.localizedDescription]) }
        }
        let removed = failures.isEmpty
        if removed {
            let album = (ui["albums"] as? [[String: Any]] ?? []).first { $0["id"] as? String == albumID }
            let storageName = album?["storageName"] as? String ?? album?["name"] as? String ?? ""
            // Only delete an empty collection created by this app. External albums are retained.
            if let nativeID = managed[storageName], let native = collection(nativeID), PHAsset.fetchAssets(in: native, options: nil).count == 0 {
                do { try await changes { PHAssetCollectionChangeRequest.deleteAssetCollections([native] as NSArray) }; managed.removeValue(forKey: storageName) }
                catch { /* The photos are already pending; an undeleted empty album is safe. */ }
            }
            ui["albums"] = (ui["albums"] as? [[String: Any]] ?? []).filter { $0["id"] as? String != albumID }
        }
        let doneSet = Set(done)
        ui["history"] = (ui["history"] as? [[String: Any]] ?? []).filter { !doneSet.contains($0["id"] as? String ?? "") && (!removed || ($0["before"] as? String != albumID && $0["after"] as? String != albumID)) }
        try save()
        var result = scan(); result["state"] = ui; result["done"] = done; result["failures"] = failures; result["removed"] = removed; return result
    }
    func trash(_ ids: [String]) async throws -> [String: Any] {
        // PhotoKit controls the confirmation and Recently Deleted retention. No file unlink operation.
        let assets = try ids.map { try asset($0) }
        try await changes { PHAssetChangeRequest.deleteAssets(assets as NSArray) }
        return ["done": ids]
    }
}

final class MediaScheme: NSObject, WKURLSchemeHandler {
    private var cancelled = Set<ObjectIdentifier>(); private let lock = NSLock()
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) { lock.lock(); cancelled.insert(ObjectIdentifier(task)); lock.unlock() }
    func active(_ task: WKURLSchemeTask) -> Bool { lock.lock(); defer { lock.unlock() }; return !cancelled.contains(ObjectIdentifier(task)) }
    func finish(_ task: WKURLSchemeTask, data: Data?, mime: String, error: Error? = nil) {
        DispatchQueue.main.async {
            guard self.active(task) else { return }
            if let error = error { task.didFailWithError(error); return }
            guard let data = data, let url = task.request.url else { task.didFailWithError(failure("原片不在本机，请先在系统照片中下载")); return }
            task.didReceive(URLResponse(url: url, mimeType: mime, expectedContentLength: data.count, textEncodingName: nil)); task.didReceive(data); task.didFinish()
        }
    }
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        lock.lock(); cancelled.remove(ObjectIdentifier(task)); lock.unlock()
        guard let url = task.request.url, url.host == "local", let a = PHAsset.fetchAssets(withLocalIdentifiers: [assetID(String(url.path.dropFirst()))], options: nil).firstObject else { finish(task, data: nil, mime: "image/jpeg"); return }
        if URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.contains(where: { $0.name == "thumb" }) == true {
            let options = PHImageRequestOptions(); options.isNetworkAccessAllowed = false; options.deliveryMode = .highQualityFormat; options.resizeMode = .fast
            PHImageManager.default().requestImage(for: a, targetSize: CGSize(width: 600, height: 600), contentMode: .aspectFit, options: options) { image, info in
                if (info?[PHImageResultIsDegradedKey] as? Bool) == true { return }; self.finish(task, data: image?.jpegData(compressionQuality: 0.85), mime: "image/jpeg", error: info?[PHImageErrorKey] as? Error)
            }
        } else {
            let options = PHImageRequestOptions(); options.isNetworkAccessAllowed = false; options.deliveryMode = .highQualityFormat; options.version = .current
            PHImageManager.default().requestImageDataAndOrientation(for: a, options: options) { data, uti, _, info in
                let mime = (uti?.contains("gif") == true) ? "image/gif" : (uti?.contains("heic") == true || uti?.contains("heif") == true) ? "image/heic" : (uti?.contains("png") == true) ? "image/png" : "image/jpeg"
                self.finish(task, data: data, mime: mime, error: info?[PHImageErrorKey] as? Error)
            }
        }
    }
}

@MainActor final class AlbumController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, QLPreviewControllerDataSource {
    var web: WKWebView!, library: PhotoLibrary?, startupError: Error?, previewURL: URL?
    var waitingSettings: CheckedContinuation<Void, Never>?
    override func viewDidLoad() {
        super.viewDidLoad(); view.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.96, alpha: 1)
        do { library = try PhotoLibrary() } catch { startupError = error }
        let configuration = WKWebViewConfiguration(); configuration.setURLSchemeHandler(MediaScheme(), forURLScheme: "media")
        configuration.allowsInlineMediaPlayback = true
        configuration.userContentController.add(self, name: "album")
        configuration.userContentController.addUserScript(WKUserScript(source: "window.Native={call:(id,method,json)=>window.webkit.messageHandlers.album.postMessage({id,method,args:JSON.parse(json)})};", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        web = WKWebView(frame: .zero, configuration: configuration); web.navigationDelegate = self; web.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(web)
        NSLayoutConstraint.activate([web.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor), web.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor), web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), web.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)])
        guard let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") else { return }
        web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        NotificationCenter.default.addObserver(self, selector: #selector(resumed), name: UIApplication.didBecomeActiveNotification, object: nil)
    }
    @objc func resumed() { waitingSettings?.resume(); waitingSettings = nil }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) { decisionHandler(action.request.url?.isFileURL == true ? .allow : .cancel) }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true, let body = message.body as? [String: Any], let id = body["id"] as? Int, let method = body["method"] as? String else { return }
        Task {
            do { let result = try await dispatch(method, body["args"] as? [String: Any] ?? [:]); reply(id, result, nil) }
            catch { reply(id, NSNull(), error.localizedDescription) }
        }
    }
    func reply(_ id: Int, _ result: Any, _ error: String?) {
        let payload: [Any] = [id, result, error as Any? ?? NSNull()]
        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: [.fragmentsAllowed]), let json = String(data: data, encoding: .utf8) else { return }
        web.evaluateJavaScript("window.nativeResult(...\(json))", completionHandler: nil)
    }
    func dispatch(_ method: String, _ args: [String: Any]) async throws -> Any {
        if let error = startupError { throw error }; guard let library = library else { throw failure("索引不可用") }
        switch method {
        case "load": return library.ui
        case "save": guard let state = args["state"] as? [String: Any] else { throw failure("无效索引") }; let before = library.ui; library.ui = state; do { try library.save() } catch { library.ui = before; throw error }; return true
        case "scan": return library.scan()
        case "import":
            if PHPhotoLibrary.authorizationStatus(for: .readWrite) == .limited {
                await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
                    PHPhotoLibrary.shared().presentLimitedLibraryPicker(from: self) { _ in continuation.resume() }
                }
            }
            else { await library.authorize() }; return library.scan()
        case "mediaAccess": return library.access()
        case "openPhotoSettings":
            guard let url = URL(string: UIApplication.openSettingsURLString) else { throw failure("无法打开设置") }
            await withCheckedContinuation { continuation in
                waitingSettings = continuation
                UIApplication.shared.open(url) { ok in if !ok { self.resumed() } }
            }; return library.scan()
        case "move": return try await library.move(args)
        case "restore": guard let id = args["id"] as? String, let location = args["location"] as? String else { throw failure("缺少回退记录") }; try await library.transfer(id, to: location); return true
        case "dissolveAlbum": return try await library.dissolve(args["albumId"] as? String ?? "")
        case "trash": return try await library.trash(args["ids"] as? [String] ?? [])
        case "playVideo": try await play(args["id"] as? String ?? ""); return true
        case "open":
            let a = try library.asset(args["id"] as? String ?? "")
            if a.mediaType == .video { try await play(args["id"] as? String ?? "") } else { try await original(a) }; return true
        default: throw failure("此系统不提供该接口。恢复已清理照片请使用 Apple 照片的‘最近删除’。")
        }
    }
    func play(_ id: String) async throws {
        guard let library = library else { throw failure("索引不可用") }; let a = try library.asset(id)
        let options = PHVideoRequestOptions(); options.isNetworkAccessAllowed = false
        let av: AVAsset = try await withCheckedThrowingContinuation { continuation in
            PHImageManager.default().requestAVAsset(forVideo: a, options: options) { asset, _, _ in
                if let asset = asset { continuation.resume(returning: asset) } else { continuation.resume(throwing: failure("视频原片不在本机，或格式不可播放")) }
            }
        }
        let player = AVPlayerViewController(); player.player = AVPlayer(playerItem: AVPlayerItem(asset: av)); present(player, animated: true) { player.player?.play() }
    }
    func original(_ a: PHAsset) async throws {
        guard let resource = PHAssetResource.assetResources(for: a).first else { throw failure("未找到原片") }
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("Preview", isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let url = folder.appendingPathComponent(UUID().uuidString + "." + (resource.originalFilename as NSString).pathExtension)
        let options = PHAssetResourceRequestOptions(); options.isNetworkAccessAllowed = false
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            PHAssetResourceManager.default().writeData(for: resource, toFile: url, options: options) { error in if let error = error { continuation.resume(throwing: error) } else { continuation.resume() } }
        }
        if let old = previewURL { try? FileManager.default.removeItem(at: old) }; previewURL = url
        let preview = QLPreviewController(); preview.dataSource = self; present(preview, animated: true)
    }
    func numberOfPreviewItems(in controller: QLPreviewController) -> Int { previewURL == nil ? 0 : 1 }
    func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem { previewURL! as NSURL }
}
