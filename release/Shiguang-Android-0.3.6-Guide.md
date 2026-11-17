# 安卓 0.3.6

后续仅维护通用安卓版与小米 Civi 4 版。直接覆盖安装，不要卸载或清数据；应用内更新继续按各自渠道选择安装包。

## 0.3.6 修正

设置的关闭按钮移到标题“设置”最右侧。删除分类时清理本地空目录；启动/刷新也会自底向上清理 Pictures/拾光、Movies/拾光 下真正为空的子目录，避免空目录被再次扫描为分类。保留拾光根目录、范围外目录，以及任何含文件（包括隐藏文件）的目录。不是删除照片文件；系统拒绝清理时不宣称本地删除成功。

真实目录测试已检查空目录、嵌套空目录、隐藏文件、原媒体字节、范围外目录与重复扫描；两个安卓界面均验证设置关闭按钮位置。Android 真机目录权限行为仍需复测。

完整说明：
- https://github.com/fei33fei/shiguang/tree/main/variants/android-universal
- https://github.com/fei33fei/shiguang/tree/main/variants/xiaomi
