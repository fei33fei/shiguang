# 拾光相册

整理本机照片、动图和视频的小工具。按时间浏览，从“待整理”开始分类；支持瀑布流缩放、左右对比、上滑待删除和最近两次整理操作回退。无账号、云存储、广告、订阅或社交广场，各设备独立保存整理进度。

当前功能基准为 **0.3.3**。以下区分已生成的安装包、未签名预览包和仍待编译的原生工程，不把界面模拟通过当作真机适配完成。

## 各版本现状

| 版本 / 平台 | 当前交付 | 验证情况与待办 |
| --- | --- | --- |
| **小米 Civi 4 专属保留版 · 0.3.3** | [小米civi4专属apk](https://github.com/fei33fei/shiguang/releases/download/v0.3.3/Shiguang-Android-0.3.3-Xiaomi-Civi4.apk) | 保留多平台适配前的原版 APK，仅增加文件备注，内容和签名不变；小米相册“最近删除”的展示差异仍存在，不能宣称已解决 |
| **通用 Android 11+ · 0.3.3** | [通用 APK](https://github.com/fei33fei/shiguang/releases/download/v0.3.3/Shiguang-Android-0.3.3-universal.apk) | 内部版本码 8；已编译、签名并通过共用界面回归，去除小米相册包名依赖；其他品牌权限、解码及回收行为仍待真机验证 |
| **Windows 11 x64 · 0.3.3** | [适配版 EXE](https://github.com/fei33fei/shiguang/releases/download/v0.3.3/Shiguang-Setup-0.3.3-multiplatform.exe) · [原版 EXE](https://github.com/fei33fei/shiguang/releases/download/v0.3.3/Shiguang-Setup-0.3.3.exe) | 已生成安装包；样例文件移动、两次回退、删除分类归还、回收站与打包程序启动测试通过；未使用商业代码签名 |
| **Mac Apple Silicon · 0.3.3** | [arm64 未签名预览 ZIP](https://github.com/fei33fei/shiguang/releases/download/v0.3.3/Shiguang-macOS-0.3.3-arm64-unsigned.zip) | 已生成应用归档并核对结构、执行权限及框架链接；未在 Mac 启动、签名或公证，需继续验证 |
| **Mac Intel · 0.3.3** | [x64 未签名预览 ZIP](https://github.com/fei33fei/shiguang/releases/download/v0.3.3/Shiguang-macOS-0.3.3-x64-unsigned.zip) | 与上项相同；整理普通目录，不直接修改 Apple 照片图库包 |
| **iPhone / iPad · 目标 iOS 16+** | [原生工程 ZIP](https://github.com/fei33fei/shiguang/releases/download/v0.3.3/Shiguang-iOS-0.3.3-source.zip) · [源码](ios) | 已准备 PhotoKit、内置视频和原画预览代码；未通过 Xcode 编译、签名或真机验证，**没有可安装 IPA** |
| **HarmonyOS NEXT / 鸿蒙 5+** | [原生工程 ZIP](https://github.com/fei33fei/shiguang/releases/download/v0.3.3/Shiguang-HarmonyNEXT-0.3.3-source.zip) · [源码](harmony) | 已准备 ArkTS 工程、Picker 和应用内预览；分类保存在拾光本机，清理受媒体权限 / ACL 限制；未 SDK 编译或签名，**没有可安装 HAP** |

完整下载与校验文件见 **[Releases](https://github.com/fei33fei/shiguang/releases/tag/v0.3.3)**。小米保留包在本地的文件名为 `Shiguang-Android-0.3.3（小米civi4专属apk）.apk`；发布附件使用英文文件名，内容相同。

## 需要了解的边界

- 第一次“删除”仅标记待删除；第二次清理才请求系统回收。安卓保留 0.3.3 的系统媒体回收列表和恢复入口，不提供永久删除接口；厂商相册私有“最近删除”可能不展示相同项目。
- iOS 通过系统相册成员关系分类；鸿蒙 NEXT 当前采用拾光本机分类索引，不能照搬安卓的任意物理目录操作。两者均未提供软件内系统回收站恢复，详细限制见平台说明。
- GIF、HDR、高分辨率图片和视频的实际显示受系统、屏幕和解码器影响。新平台原生媒体和权限尚未完成真机验收。

## 文档

- **[用户使用说明](使用说明.md)**：安装、授权、整理、文件夹、两次回退及删除恢复的操作方法。
- [多平台适配说明](platforms/适配说明.md)：平台差异、交付范围及后续构建条件。
- [验证记录](platforms/验证记录.md)：已执行测试与尚未验证的项目。
- [开发与构建](docs/开发构建.md)：源码结构、构建命令与测试方式。
- [项目进度](STATUS.md)：当前阶段与后续工作。

## 源码与分发

仓库保存各平台源代码、测试、构建脚本、文档和 0.3.3 改动前源码快照。APK、EXE、Mac ZIP、独立工程压缩包及校验清单在同一仓库的 Releases 发布。

签名私钥、密码、证书、本机 SDK、`node_modules` 和测试临时数据不上传。源码中的构建脚本可生成新的本地签名；要覆盖已有安卓安装，必须使用原签名。
