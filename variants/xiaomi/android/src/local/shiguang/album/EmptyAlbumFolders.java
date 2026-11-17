package local.shiguang.album;
import java.io.*;import java.util.*;

/** Removes directories only, after checking real emptiness; never deletes a media or hidden file. */
final class EmptyAlbumFolders {
 static final class Result {final Set<String> removed=new LinkedHashSet<>(),failed=new LinkedHashSet<>();}
 static Result clean(File external)throws IOException{
  File base=external.getCanonicalFile();Result result=new Result();
  for(String root:new String[]{"Pictures/拾光","Movies/拾光"}){
   File parent=new File(base,root);
   if(!parent.getCanonicalFile().equals(parent.getAbsoluteFile()))continue;
   File[] entries=parent.listFiles();if(entries==null)continue;
   for(File child:entries)visit(base,parent,child,result);
  }return result;
 }
 static void visit(File base,File root,File dir,Result result)throws IOException{
  // Refuse links, aliases and anything outside the chosen app folder.
  File canonical=dir.getCanonicalFile();if(!canonical.equals(dir.getAbsoluteFile())||!canonical.getPath().startsWith(root.getCanonicalPath()+File.separator)||!dir.isDirectory())return;
  String relative=canonical.getPath().substring(base.getPath().length()+1).replace(File.separatorChar,'/')+"/";
  File[] entries=dir.listFiles();if(entries==null){result.failed.add(relative);return;}
  for(File child:entries)if(child.isDirectory())visit(base,root,child,result);
  entries=dir.listFiles();if(entries==null){result.failed.add(relative);return;}
  if(entries.length==0){if(dir.delete()||!dir.exists())result.removed.add(relative);else result.failed.add(relative);}
 }
}
