package local.shiguang.album;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.WindowInsets;
import android.widget.*;

/** Plays the original content URI with the device decoder; no WebView stream or conversion. */
public class VideoActivity extends Activity {
 float touchX,touchY;
 @Override public boolean dispatchTouchEvent(android.view.MotionEvent event){if(event.getAction()==0){touchX=event.getX();touchY=event.getY();}if(event.getAction()==1){float dx=event.getX()-touchX,dy=event.getY()-touchY;if(Math.abs(dx)>100&&Math.abs(dx)>Math.abs(dy)*1.4){setResult(RESULT_OK,new Intent().putExtra("direction",dx<0?"next":"previous"));finish();return true;}}return super.dispatchTouchEvent(event);}
 VideoView video;TextView status;int resumePosition;boolean resumePlaying=true,prepared=false;
 @Override public void onCreate(Bundle state){
  super.onCreate(state);getWindow().setColorMode(android.content.pm.ActivityInfo.COLOR_MODE_HDR);getWindow().setDecorFitsSystemWindows(false);getWindow().setStatusBarColor(0xff101b16);getWindow().setNavigationBarColor(0xff101b16);
  if(state!=null){resumePosition=state.getInt("position");resumePlaying=state.getBoolean("playing",true);}
  LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(0xff101b16);
  root.setOnApplyWindowInsetsListener((view,insets)->{android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());view.setPadding(bars.left,bars.top,bars.right,bars.bottom);return insets;});
  LinearLayout bar=new LinearLayout(this);bar.setGravity(Gravity.CENTER_VERTICAL);Button back=new Button(this);back.setText("‹ 返回整理");back.setOnClickListener(v->finish());bar.addView(back);
  TextView title=new TextView(this);title.setText(getIntent().getStringExtra("name"));title.setTextColor(Color.WHITE);title.setTextSize(13);title.setMaxLines(2);title.setPadding(14,0,10,0);bar.addView(title,new LinearLayout.LayoutParams(0,-2,1));root.addView(bar);
  FrameLayout surface=new FrameLayout(this);video=new VideoView(this);FrameLayout.LayoutParams player=new FrameLayout.LayoutParams(-1,-1,Gravity.CENTER);surface.addView(video,player);root.addView(surface,new LinearLayout.LayoutParams(-1,0,1));
  status=new TextView(this);status.setTextColor(0xffc8d9cd);status.setTextSize(12);status.setPadding(16,12,16,12);status.setText("正在准备本地视频…");root.addView(status);
  Button external=new Button(this);external.setText("兼容性备用：用其他播放器打开");external.setOnClickListener(v->openExternal());root.addView(external);setContentView(root);root.requestApplyInsets();
  MediaController controls=new MediaController(this);controls.setAnchorView(video);video.setMediaController(controls);
  video.setOnPreparedListener(media->{prepared=true;status.setText("拾光内置播放 · 点击画面显示播放和进度控制");if(resumePosition>0)video.seekTo(resumePosition);if(resumePlaying)video.start();controls.show(2500);});
  video.setOnCompletionListener(media->{resumePlaying=false;status.setText("播放结束 · 可拖动进度重看，或返回继续整理");controls.show(0);});
  video.setOnErrorListener((media,what,extra)->{prepared=false;status.setText("系统未能播放此视频（"+what+" / "+extra+"）。可能是编码、文件读取或文件损坏，可尝试下方备用播放器。原文件未改动。");return true;});
  Uri uri=getIntent().getData();if(uri==null){status.setText("视频地址无效，请返回后刷新照片库");return;}try{video.setVideoURI(uri);}catch(Exception e){status.setText("无法读取视频，请返回相册权限补充访问授权");}
 }
 void openExternal(){try{Intent intent=new Intent(Intent.ACTION_VIEW).setDataAndType(getIntent().getData(),getContentResolver().getType(getIntent().getData())).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivity(intent);}catch(Exception e){Toast.makeText(this,"未找到可用的其他播放器",Toast.LENGTH_LONG).show();}}
 @Override protected void onPause(){if(prepared){resumePosition=video.getCurrentPosition();resumePlaying=video.isPlaying();video.pause();}super.onPause();}
 @Override protected void onResume(){super.onResume();if(prepared&&resumePlaying)video.start();}
 @Override protected void onSaveInstanceState(Bundle state){state.putInt("position",prepared?video.getCurrentPosition():resumePosition);state.putBoolean("playing",prepared?video.isPlaying():resumePlaying);super.onSaveInstanceState(state);}
 @Override protected void onDestroy(){if(video!=null)video.stopPlayback();super.onDestroy();}
}
