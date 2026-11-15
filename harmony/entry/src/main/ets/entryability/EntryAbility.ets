import { UIAbility } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';
export default class EntryAbility extends UIAbility {
  onWindowStageCreate(stage: window.WindowStage): void {
    stage.getMainWindow().then(main => { main.setWindowLayoutFullScreen(false); main.setWindowSystemBarProperties({ statusBarColor: '#f7f9f6', statusBarContentColor: '#17251c', navigationBarColor: '#f7f9f6', navigationBarContentColor: '#17251c' }); });
    stage.loadContent('pages/Index');
  }
}
