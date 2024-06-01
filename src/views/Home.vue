<template>
  <div class="main">
    <div class="wrap">
      <ScrollCard>
        <ScrollCardItem name="导入原图">
          <el-radio-group style="margin-bottom:10px" v-model="importForm.importType" @change="changeImportType">
            <el-radio label="image">上传图片</el-radio>
            <el-radio label="text">文本生图</el-radio>
          </el-radio-group>
          <!-- 上传图片 -->
          <template v-if="importForm.importType=='image'">
            <el-upload
              :class="['upload-wrap', { hasImage: fileList.length > 0 }]"
              drag
              action
              :auto-upload="false"
              :limit="1"
              :file-list="fileList"
              :on-remove="handelOnRemove"
              :on-change="handelOnChange"
              accept=".jpg, .png"
            >
              <i class="el-icon-upload"></i>
              <div class="el-upload__text">
                将文件拖到此处，或
                <em>点击上传</em>
              </div>
              <div class="el-upload__tip" slot="tip">*只能上传jpg/png文件</div>
            </el-upload>
          </template>
          <!-- 文本生图 -->
          <template v-else-if="importForm.importType=='text'">
            <el-input type="textarea" v-model="importForm.text" :autosize="{ minRows: 5, maxRows: 10 }" placeholder="请输入文本"></el-input>
            <el-form class="importForm" inline size="small">
              <el-form-item label="字号：">
                <el-select v-model="importForm.fontSize">
                  <el-option v-for="num in 30" :key="num" :value="num" :label="num+'pt'"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="对齐：">
                <el-select v-model="importForm.textAlign">
                  <el-option label="左对齐" value="left"></el-option>
                  <el-option label="居中对齐" value="center"></el-option>
                  <el-option label="右对齐" value="right"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="颜色：">
                <el-color-picker v-model="importForm.color" @change="changColor"></el-color-picker>
              </el-form-item>
              <el-form-item label="字体：">
                <el-button size="mini" icon="el-icon-upload2">上传字体</el-button>
              </el-form-item>
            </el-form>
            <el-button type="primary" size="small" @click="textToImage">生成图片</el-button>
          </template>
        </ScrollCardItem>
        <ScrollCardItem name="渲染预览" :hide="!imgLoaded">
          <div class="preview">
            <div class="card left">
              <div class="title">Before</div>
              <canvas ref="canvas_before"></canvas>
            </div>
            <div class="card right">
              <div class="title">After</div>
              <canvas ref="canvas_after"></canvas>
            </div>
          </div>
          <div class="result" v-if="cfgLoaded">
            <div class="info">
              当前配置：
              <ul class="configItems">
                <li>宽：{{config.width}}</li>
                <li>高：{{config.height}}</li>
                <li>算法：{{ALL_RENDER_MODE[config.form.renderMode]}}</li>
                <li v-if="['bw','monitor_bw'].includes(config.form.renderMode)">阈值：{{config.form.threshold}}</li>
                <li v-else>对比度：{{config.form.contrast}}</li>
                <li v-if="config.form.renderMode!='bw'">亮度：{{config.form.brightness}}</li>
              </ul>
              <ul class="configItems">
                <li>生成类型：{{GENERATE_MODE[config.form.generateMode]}}</li>
                <li>平面高度：{{config.form.z}}</li>
                <li>建筑间距：{{config.form.space}}</li>
              </ul>
            </div>
            <div class="resBtn">
              <el-button type="warning" @click="generateBlueprint">生 成 蓝 图</el-button>
            </div>
          </div>
        </ScrollCardItem>
        <ScrollCardItem name="参数配置" :hide="!imgLoaded">
          <template #topRight>
            <el-button size="small" type="primary" @click="confirmSetting">应用配置</el-button>
          </template>
          <el-form ref="settingFormRef" :model="settingForm" label-width="95px" size="small" hide-required-asterisk>
            <div class="flexInputWrap">
              <el-form-item label="宽：" prop="comWidth" :rules="rules.blurNotNull">
                <el-input type="number" v-model.lazy="settingForm.comWidth" @change="changeComWidth($event)"></el-input>
              </el-form-item>
              <div class="fixedRatioBtn" title="固定比例" @click="changeFixedRatio">
                <i :class="settingForm.fixedRatio?'el-icon-link':'if-icon-unlink'"></i>
              </div>
              <el-form-item label="长：" prop="comHeight" :rules="rules.blurNotNull">
                <el-input type="number" v-model.lazy="settingForm.comHeight" @change="changeComHeight($event)"></el-input>
              </el-form-item>
              <el-button class="refreshBtn" type="text" icon="el-icon-refresh-left" @click="resetComSize"></el-button>
            </div>
            <el-form-item label="缩放：" prop="scale" :rules="rules.changeNotNull">
              <el-slider v-model="settingForm.scale" :disabled="!settingForm.fixedRatio" :step="0.01" step-strictly :format-tooltip="formatTooltip" :min="0" :max="maxScale" @change="changeScale"></el-slider>
            </el-form-item>
            <el-divider content-position="left">渲染方案</el-divider>
            <el-form-item label="算法：" prop="renderMode" :rules="rules.changeNotNull">
              <el-radio-group v-model="settingForm.renderMode">
                <el-radio v-for="k in Object.keys(renderOptions)" :key="k" :label="k">{{renderOptions[k]}}</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="阈值：" v-if="['bw','monitor_bw'].includes(settingForm.renderMode)" prop="threshold" :rules="rules.changeNotNull">
              <el-slider v-model="settingForm.threshold" :min="0" :max="255"></el-slider>
            </el-form-item>
            <el-form-item v-else label="对比度：" prop="contrast" :rules="rules.changeNotNull">
              <el-slider v-model="settingForm.contrast" :min="-255" :max="255" :marks="{0:''}"></el-slider>
            </el-form-item>
            <el-form-item v-if="settingForm.renderMode!='bw'" label="亮度：" prop="brightness" :rules="rules.changeNotNull">
              <el-slider v-model="settingForm.brightness" :min="-255" :max="255" :marks="{0:''}"></el-slider>
            </el-form-item>
            <el-divider content-position="left">生成方案</el-divider>
            <el-form-item label="生成类型：" prop="generateMode" :rules="rules.changeNotNull">
              <el-radio-group v-model="settingForm.generateMode">
                <el-radio v-for="k in Object.keys(GENERATE_MODE)" :key="k" :label="k">{{GENERATE_MODE[k]}}</el-radio>
              </el-radio-group>
            </el-form-item>
            <div class="flexInputWrap">
              <el-form-item label="平面高度：" prop="z" :rules="rules.blurNotNull">
                <el-input-number v-model="settingForm.z" :min="0" :max="999"></el-input-number>
              </el-form-item>
              <el-form-item label="建筑间距" prop="space" :rules="rules.blurNotNull">
                <el-input-number v-model="settingForm.space" :min="0" :max="10" :step="0.01" step-strictly></el-input-number>
              </el-form-item>
            </div>
          </el-form>
        </ScrollCardItem>
      </ScrollCard>
    </div>
    <div class="loading-mask" v-if="fullscreenLoading">
      <div class="loading-spinner">
        <svg viewBox="25 25 50 50" class="circular">
          <circle cx="50" cy="50" r="20" fill="none" class="path" />
        </svg>
        <div class="title" v-if="loadingTitle">{{loadingTitle}}</div>
        <el-progress v-if="showLoadingBar" :text-inside="true" :stroke-width="22" :percentage="loadingPct" class="progress"></el-progress>
      </div>
    </div>

    <!-- 生成蓝图结果 -->
    <el-dialog title="生成蓝图成功" custom-class="blueprintResDialog" :visible.sync="showBlueprintRes" width="500px" top="25vh" :before-close="closeBlueprintRes">
      <template v-if="blueprintTxt">
        <div class="item">
          <div class="btnsWrap">
            <div class="btns">
              <el-button type="primary" icon="el-icon-document-copy" size="small" plain @click="copyBlueprint(blueprintTxt, $refs.txtRef)">复制到剪贴板</el-button>
              <el-button type="primary" icon="el-icon-download" size="small" @click="downloadBlueprint(blueprintTxt)">下载蓝图文件</el-button>
            </div>
          </div>
          <div class="textarea">
            <el-input type="textarea" v-model="blueprintTxt" :rows="3" readonly ref="txtRef"></el-input>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import ScrollCard from "@/components/ScrollCard.vue";
import ScrollCardItem from "@/components/ScrollCardItem.vue";
import * as Parser from "@/utils/parser";
// import * as itemsUtil from "@/utils/itemsUtil";
import * as Util from "@/utils/index.js";
import * as ImageUtil from "@/utils/imageUtil.js";
import * as BuildingUtil from "@/utils/buildingUtil.js";
const MIN_SIZE = 1;
const MAX_SIZE = 1000;
const DEFAULT_WIDTH = 50; // 图片默认生成宽度
const RENDER_MODE = {
  belt_horiz: { bw: "黑白", gray: "灰度" },
  belt_verti: { bw: "黑白", gray: "灰度" },
  monitor: {
    monitor_bw: "黑白",
    monitor_gray: "灰度表索引",
    monitor_color_euclid: "全颜色表索引(Euclid Dis)",
  },
};
const ALL_RENDER_MODE = {};
Object.keys(RENDER_MODE).forEach((k) => {
  Object.assign(ALL_RENDER_MODE, RENDER_MODE[k]);
});
const GENERATE_MODE = {
  belt_horiz: "水平带屏",
  belt_verti: "垂直带屏",
  monitor: "流速器屏幕",
};
export default {
  name: "Home",
  components: {
    ScrollCard,
    ScrollCardItem,
  },
  data() {
    return {
      MIN_SIZE: MIN_SIZE,
      MAX_SIZE: MAX_SIZE,
      ALL_RENDER_MODE: ALL_RENDER_MODE,
      GENERATE_MODE: GENERATE_MODE,
      importForm: {
        importType: "image", // 导入模式 image:上传图片 text:文本生图
        text: "",
        fontSize: 9,
        textAlign: "left",
        color: "#000",
        width: null, // 初始图像大小
        height: null,
        image: null, // 原始图像 Image
      },
      /**
       * @typedef SettingForm
       * @property {boolean} fixedRatio 是否固定比例
       * @property {number} comWidth 设置宽度
       * @property {number} comHeight 设置高度
       * @property {number} scale 宽高缩放
       *
       * @property {string} renderMode 渲染模式 @see RENDER_MODE
       * @property {number} threshold 黑白阈值
       * @property {number} contrast 对比度
       * @property {number} brightness 亮度
       *
       * @property {string} generateMode 生成模式 @see GENERATE_MODE
       * @property {number} z 生成高度
       * @property {number} space 建筑间距
       */
      /** @type SettingForm */
      settingForm: {
        fixedRatio: true,
        comWidth: null,
        comHeight: null,
        scale: 1,
        renderMode: "gray",
        threshold: 128,
        contrast: 0,
        brightness: 0,
        generateMode: "belt_horiz",
        z: 0,
        space: 1,
      },
      imgLoaded: false, // 加载图像
      cfgLoaded: false, // 加载配置
      config: {
        /** @type SettingForm */
        form: null,
        width: null,
        height: null,
      },
      beforeBase64: null,
      afterBase64: null,
      showBlueprintRes: false,
      blueprintTxt: null,
      rules: {
        blurNotNull: [
          {
            required: true,
            message: "不能为空",
            trigger: "blur",
          },
        ],
        changeNotNull: [
          {
            required: true,
            message: "不能为空",
            trigger: "change",
          },
        ],
      },
      fullscreenLoading: false,
      loadingTitle: null,
      showLoadingBar: false,
      loadingPct: 0,
      fileList: [],
    };
  },
  computed: {
    menuData() {
      let menuData = [{ menuName: "上传图片" }];
      if (this.imgLoaded) {
        menuData.push({ menuName: "渲染预览" }, { menuName: "参数配置" }, { menuName: "生成结果" });
      }
      return menuData;
    },
    maxScale() {
      if (!this.importForm.width || !this.importForm.height) return 0;
      return Math.min(MAX_SIZE / this.importForm.width, MAX_SIZE / this.importForm.height) + 0.01;
    },
    renderOptions() {
      let options = RENDER_MODE[this.settingForm.generateMode] || {};
      if (
        this.settingForm.renderMode == null ||
        !Object.prototype.hasOwnProperty.call(options, this.settingForm.renderMode)
      ) {
        this.$set(this.settingForm, "renderMode", Object.keys(options)[0]);
      }
      return options;
    },
  },
  methods: {
    changeScale(val) {
      this.settingForm.scale = val = Math.min(this.maxScale, val);
      if (this.importForm.width != null) {
        this.settingForm.comWidth = this.limitSize(this.importForm.width * val);
      }
      if (this.importForm.height != null) {
        this.settingForm.comHeight = this.limitSize(this.importForm.height * val);
      }
    },
    changeComWidth(val, updateScale = false) {
      this.settingForm.comWidth = this.limitSize(val);
      if ((updateScale || this.settingForm.fixedRatio) && this.importForm.width != null) {
        // 锁定比例
        this.changeScale(this.settingForm.comWidth / this.importForm.width);
      }
    },
    changeComHeight(val, updateScale = false) {
      this.settingForm.comHeight = this.limitSize(val);
      if ((updateScale || this.settingForm.fixedRatio) && this.importForm.height != null) {
        // 锁定比例
        this.changeScale(this.settingForm.comHeight / this.importForm.height);
      }
    },
    changeFixedRatio() {
      this.settingForm.fixedRatio = !this.settingForm.fixedRatio;
      if (this.settingForm.fixedRatio) {
        this.changeComWidth(this.settingForm.comWidth, true);
      }
    },
    resetComSize() {
      if (this.importForm.importType === "text") {
        this.changeComWidth(this.importForm.width, true);
      } else {
        this.changeComWidth(DEFAULT_WIDTH, true);
      }
    },
    limitSize(num) {
      return Math.min(MAX_SIZE, Math.max(MIN_SIZE, !num ? 0 : parseInt(num)));
    },
    showLoading(title, showLoadingBar = false) {
      this.fullscreenLoading = true;
      this.loadingTitle = title;
      this.showLoadingBar = showLoadingBar;
      this.loadingPct = 0;
    },
    hideLoading() {
      this.fullscreenLoading = false;
      this.showLoadingBar = false;
      this.loadingPct = 0;
    },
    init() {
      this.importForm.width = null;
      this.importForm.height = null;
      this.importForm.image = null;
      this.imgLoaded = false;
      this.cfgLoaded = false;
      this.config = {};
      this.beforeBase64 = null;
      this.afterBase64 = null;
      this.blueprintTxt = null;
    },
    changeImportType() {
      this.fileList = [];
      this.init();
    },
    // 上传图片start
    handelOnChange(file, fileList) {
      this.fileList = fileList;
      if (!["image/jpeg", "image/png"].includes(file.raw.type)) {
        Util._warn("上传失败，请上传jpg/png格式的文件");
        this.handelOnRemove(file);
        return;
      }
      this.loadImage(file);
      this.init();
    },
    handelOnRemove(file) {
      this.fileList = this.fileList.filter((item) => item.uid != file.raw.uid);
      this.init();
    },
    // beforeRemove(file) {
    //   return this.$confirm(`确定移除 ${file.name}？`).then(() => {
    //     this.init();
    //   });
    // },
    loadImage(file) {
      const reader = new FileReader();
      this.showLoading();
      reader.onload = (event) => {
        const image = new Image();
        image.src = event.target.result;
        image.onload = () => {
          this.importForm.width = image.width;
          this.importForm.height = image.height;
          this.changeComWidth(DEFAULT_WIDTH, true); // 默认生成宽度
          this.imgLoaded = true;
          this.hideLoading();
          this.$nextTick(() => {
            this.render();
          });
        };
        this.importForm.image = image;
      };
      reader.readAsDataURL(file.raw);
    },
    // 上传图片end
    // 文本生图start
    changColor(val) {
      if (!val) {
        this.$set(this.importForm, "color", "#000000");
      }
    },
    textToImage() {
      let { text, fontSize, textAlign, color } = this.importForm;
      if (!text) {
        return Util._warn("请输入文本！");
      }
      this.init();
      this.showLoading();
      ImageUtil.textToBase64({ content: text, fontSize, textAlign, color })
        .then((base64) => {
          const image = new Image();
          image.src = base64;
          image.onload = () => {
            this.importForm.width = image.width;
            this.importForm.height = image.height;
            this.changeComWidth(this.importForm.width, true); // 默认生成宽度为文本宽度
            this.imgLoaded = true;
            this.hideLoading();
            this.$nextTick(() => {
              this.render();
            });
          };
          this.importForm.image = image;
        })
        .catch((e) => {
          Util._err("文本生成图片异常", e);
          this.hideLoading();
        });
    },
    // 文本生图end
    loadConfig() {
      this.config = {
        form: JSON.parse(JSON.stringify(this.settingForm)),
        width: this.settingForm.comWidth,
        height: this.settingForm.comHeight,
      };
      this.cfgLoaded = true;
    },
    confirmSetting() {
      this.$refs.settingFormRef.validate((valid) => {
        if (valid) {
          this.render();
        } else {
          Util._warn("表单验证未通过");
        }
      });
    },
    async render() {
      if (!this.imgLoaded || this.importForm.image == null) {
        return Util._warn("请先上传图片");
      }
      this.loadConfig();
      this.showLoading("渲染中", true);
      try {
        const image = this.importForm.image;
        const { renderMode, threshold, contrast, brightness } = this.config.form;
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        let [w, h] = [this.config.width, this.config.height];
        canvas.width = w;
        canvas.height = h;
        // 禁用平滑
        this.closeSmoothing(context);

        // before
        context.drawImage(image, 0, 0, w, h);
        this.beforeBase64 = canvas.toDataURL();

        // after
        let imgData = context.getImageData(0, 0, w, h);
        const _progress = this.handleLoadingProgress;
        if (renderMode == "bw") {
          await ImageUtil.handleBlackWhite(imgData, threshold, _progress);
        } else if (renderMode == "gray") {
          await ImageUtil.handleGray(imgData, contrast, brightness, _progress);
        } else if (renderMode == "monitor_bw") {
          await ImageUtil.handleMonitorBlackWhite(imgData, threshold, brightness, _progress);
        } else if (renderMode == "monitor_gray") {
          await ImageUtil.handleMonitorGray(imgData, contrast, brightness, _progress);
        } else if (renderMode == "monitor_color_euclid") {
          await ImageUtil.handleMonitorColorEuclid(imgData, contrast, brightness, _progress);
        }
        context.putImageData(imgData, 0, 0);
        this.afterBase64 = canvas.toDataURL();
        this.preview();
      } catch (e) {
        Util._err("渲染异常", e);
      } finally {
        this.hideLoading();
      }
    },
    handleLoadingProgress(fn, percentage, step = 5) {
      return new Promise((resolve) => {
        fn();
        if (percentage - this.loadingPct >= step) {
          this.loadingPct = percentage;
          requestAnimationFrame(resolve); // 每step%断开串行避免阻塞
        } else {
          resolve();
        }
      });
    },
    preview() {
      this.loadCanvas(this.$refs.canvas_before, this.beforeBase64);
      this.loadCanvas(this.$refs.canvas_after, this.afterBase64);
    },
    loadCanvas(canvas, base64) {
      if (canvas == null || base64 == null) return;
      const image = new Image();
      image.src = base64;
      let ctx = canvas.getContext("2d");
      image.onload = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = (canvas.offsetWidth / this.config.width) * this.config.height;
        // 禁用平滑
        this.closeSmoothing(ctx);
        ctx.drawImage(
          image,
          0,
          0,
          this.config.width,
          this.config.height,
          0,
          0,
          canvas.width,
          canvas.height
        );
      };
    },
    // 禁用平滑
    closeSmoothing(ctx) {
      ctx.mozImageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.msImageSmoothingEnabled = false;
      ctx.imageSmoothingEnabled = false;
      ctx.oImageSmoothingEnabled = false;
    },
    // 生成蓝图
    generateBlueprint() {
      if (!this.cfgLoaded) {
        return Util._warn("请先渲染数据");
      }
      this.showLoading("数据转换中", true);
      const image = new Image();
      image.src = this.afterBase64;
      let canvas = document.createElement("canvas");
      let ctx = canvas.getContext("2d");
      let [w, h] = [this.config.width, this.config.height];
      image.onload = async () => {
        // 禁用平滑
        try {
          this.closeSmoothing(ctx);
          ctx.drawImage(image, 0, 0, w, h);
          let imgData = ctx.getImageData(0, 0, w, h);
          this.config.name = GENERATE_MODE[this.config.form.generateMode];

          const blueprint = await BuildingUtil.generateBlueprint(
            imgData,
            this.config,
            this.handleLoadingProgress
          );
          window.requestAnimationFrame(() => {
            this.outputBlueprintTxt(blueprint);
          });
        } catch (e) {
          Util._err("解析异常", e);
        } finally {
          this.hideLoading();
        }
      };
    },
    outputBlueprintTxt(blueprint) {
      this.showLoading("生成蓝图中");
      window.requestAnimationFrame(() => {
        try {
          this.blueprintTxt = Parser.toStr(blueprint);
          this.showBlueprintRes = true;
        } catch (e) {
          Util._err("生成异常", e);
        } finally {
          this.hideLoading();
        }
      });
    },
    // 复制蓝图
    async copyBlueprint(txt, textRef) {
      if (txt == null) {
        return Util._warn("请先生成数据！");
      }
      if (textRef == null) {
        return Util._warn("复制失败！");
      }
      textRef.select(); // 聚焦元素才可复制
      let errMsg;
      const Clipboard = navigator?.clipboard;
      if (Clipboard) {
        try {
          await Clipboard.writeText(txt);
          return Util._success(`已将蓝图复制到剪贴板！`);
        } catch (e) {
          errMsg = "未授权复制权限";
        }
      } else {
        errMsg = "浏览器不支持复制";
      }
      try {
        // 降级尝试使用execCommand复制
        document.execCommand("copy");
        Util._success(`已将蓝图复制到剪贴板！`);
      } catch (e) {
        Util._warn(errMsg);
      }
    },
    // 下载蓝图
    downloadBlueprint(txt) {
      Util.saveAsTxt(txt, "blueprint" + Date.now(), "txt");
    },
    closeBlueprintRes(done) {
      this.$confirm("确定关闭生成结果么?", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(() => {
          this.showBlueprintRes = false;
          this.blueprintTxt = null;
          done();
        })
        .catch(() => {});
    },
    formatTooltip(val) {
      if (!val) return 0;
      return val.toFixed(2);
    },
    jump(index) {
      if (index == "联系作者") {
        return window.open("https://space.bilibili.com/34117233");
      } else if (index == "查看更新") {
        return window.open("");
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.main {
  background: #f0f2f5;
  .wrap {
    max-width: 1000px;
    margin: auto;
    background: #fff;
    box-shadow: 0 0 20px 15px #fff;
    height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 10;
    .el-form {
      // min-width: 330px;
      ::v-deep .el-form-item__error {
        position: unset;
      }
      ::v-deep .el-collapse-item__header {
        font-size: 14px;
        color: #606266;
      }
      ::v-deep .el-collapse-item__content {
        font-size: 14px;
        text-indent: 2em;
        color: #606266;
        .line {
          margin-top: 10px;
        }
      }
    }
  }
  .upload-wrap {
    ::v-deep .el-upload {
      transition: all 0.5s;
      display: block;
      height: 180px;
      .el-upload-dragger {
        width: 100%;
        min-width: 330px;
      }
    }
    .el-upload__tip {
      transition: all 0.5s;
    }
    &.hasImage {
      ::v-deep .el-upload {
        opacity: 0;
        height: 0;
        user-select: none;
        overflow: hidden;
      }
      .el-upload__tip {
        height: 0;
        opacity: 0;
        margin: 0;
        user-select: none;
      }
    }
  }
  .importForm {
    margin-top: 10px;
    .el-input,
    .el-select {
      width: 130px;
    }
  }
  .preview {
    display: flex;
    justify-content: space-between;
    min-width: 330px;
    .card {
      width: calc((100% - 20px) / 2);
      padding: 10px 20px;
      box-sizing: border-box;
      border: 1px solid #ccc;
      .title {
        font-size: 14px;
        text-align: center;
      }
      canvas {
        width: 100%;
        background: #f5f7fa;
      }
    }
  }
  .result {
    .info {
      margin-top: 10px;
      font-size: 14px;
      line-height: 14px;
      color: #666;
      .configItems {
        display: inline;
        list-style: none;
        line-height: 14px;
        color: #999;
        &::after {
          content: "；";
        }
        li {
          font-size: 12px;
          display: inline;
        }
        li + li {
          &::before {
            content: "|";
            margin: 0 5px;
            color: #ccc;
          }
        }
      }
      .configItems + .configItems {
        margin-left: 10px;
        &::after {
          content: "";
        }
      }
    }
    .resBtn {
      margin-top: 10px;
      text-align: center;
    }
  }
  .flexInputWrap {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: center;
    margin-bottom: 18px;
    .el-form-item {
      margin-bottom: 0;
    }
    .el-input {
      width: 130px;
    }
    .fixedRatioBtn {
      width: 30px;
      margin-left: 10px;
      margin-right: -40px;
      font-size: 20px;
      color: #666;
      text-align: center;
      z-index: 99;
      cursor: pointer;
      .if-icon-unlink {
        color: $--color-danger;
      }
    }
    .refreshBtn {
      padding: 0;
      margin-left: 10px;
    }
  }
  .loading-mask {
    position: fixed;
    z-index: 2000;
    background-color: hsla(0, 0%, 100%, 0.6);
    margin: 0;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    transition: opacity 0.3s;
    .loading-spinner {
      text-align: center;
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      .circular {
        height: 42px;
        width: 42px;
        animation: loading-rotate 2s linear infinite;
        @keyframes loading-rotate {
          to {
            transform: rotate(1turn);
          }
        }
        .path {
          animation: loading-dash 1.5s ease-in-out infinite;
          stroke-dasharray: 90, 150;
          stroke-dashoffset: 0;
          stroke-width: 2;
          stroke: $--color-primary;
          stroke-linecap: round;
          @keyframes loading-dash {
            0% {
              stroke-dasharray: 1, 200;
              stroke-dashoffset: 0;
            }
            50% {
              stroke-dasharray: 90, 150;
              stroke-dashoffset: -40px;
            }
            to {
              stroke-dasharray: 90, 150;
              stroke-dashoffset: -120px;
            }
          }
        }
      }
      .title {
        color: $--color-primary;
      }
      .progress {
        margin-top: 50px;
        ::v-deep .el-progress-bar__outer {
          width: 60vw;
          .el-progress-bar__inner {
            transition: unset;
          }
        }
      }
    }
  }
}
</style>

<style lang="scss">
.blueprintResDialog {
  .item {
    .btnsWrap {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btns {
      flex: 1;
      display: flex;
      justify-content: space-around;
      align-items: center;
    }
    .textarea {
      margin-top: 10px;
    }
  }
}
</style>