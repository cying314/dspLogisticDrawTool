import Vue from 'vue';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import App from './App.vue';

import "./styles/iconfont.css";

Vue.config.productionTip = false

Vue.use(ElementUI);

new Vue({
  render: h => h(App)
}).$mount('#app')
