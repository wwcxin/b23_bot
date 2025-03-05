import { definePlugin } from '../../src/core/PluginManager';
import { segment } from '../../src/core/segment';

const keyword = ['ikun', '鸡哥', '鲲鲲', '坤坤'];

export default definePlugin({
  name: 'demo',
  version: '1.0.0',
  setup(ctx) {
    ctx.handle('message', async (e) => {
      // 处理群消息
      // console.log(e);
      if(ctx.text(e) === '测试1'){
        e.reply(['测试', segment.face("100")], true)
      }

      if(keyword.some(item => item === ctx.text(e))){
        try {
            if(keyword.some(item => item === ctx.text(e))){
                const url = await ctx.http.get('https://api.tangdouz.com/zzz/j.php')
                console.log(url.data);
                console.log(JSON.stringify(segment.record(url.data), null, 2));
                e.reply([segment.record(url.data)])
            }
        } catch(err){
            console.error('Error fetching data:', err);
            e.reply(['Error:', err], true);
        }
      }
    })
  }
})