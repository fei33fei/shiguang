package local.shiguang.album;
import java.io.*;import java.nio.file.*;
public class EmptyAlbumFoldersTest {
 static void check(boolean condition,String message){if(!condition)throw new AssertionError(message);}
 public static void main(String[] args)throws Exception{
  File base=new File(args[0]);base.mkdirs();File pictures=new File(base,"Pictures/拾光"),movies=new File(base,"Movies/拾光");pictures.mkdirs();movies.mkdirs();
  File empty=new File(pictures,"空相册"),nested=new File(movies,"A/B/C"),keep=new File(pictures,"非空"),hidden=new File(pictures,"隐藏文件");empty.mkdirs();nested.mkdirs();keep.mkdirs();hidden.mkdirs();
  byte[] media={12,34,56};Files.write(new File(keep,"photo.jpg").toPath(),media);Files.write(new File(hidden,".nomedia").toPath(),new byte[]{1});File outside=new File(base,"DCIM/empty");outside.mkdirs();
  EmptyAlbumFolders.Result result=EmptyAlbumFolders.clean(base);
  check(!empty.exists(),"empty album removed");check(!new File(movies,"A").exists(),"empty descendants removed bottom up");check(pictures.isDirectory()&&movies.isDirectory(),"拾光 roots preserved");check(outside.isDirectory(),"outside folders preserved");check(hidden.isDirectory(),"hidden files count as contents");check(java.util.Arrays.equals(media,Files.readAllBytes(new File(keep,"photo.jpg").toPath())),"media bytes preserved");check(result.removed.contains("Pictures/拾光/空相册/"),"deleted paths reported");check(EmptyAlbumFolders.clean(base).removed.isEmpty(),"repeat scan is idempotent");
  System.out.println("PASS: actual directory cleanup, nested empties, roots/outside/hidden/media preservation, repeated scan.");
 }
}
