import { Notification, Message, MessageBox } from "element-ui";
import { saveAs } from "file-saver";
import {
  grayColorIndexMap,
  grayColorIndexs,
  rgbColor,
  colorIndexMap,
  rgbToHex,
} from "@/data/monitorColor.js";

/**
 * 使元素动画滚动到指定高度
 * @param {Element} element 滚动元素
 * @param {number} targetScrollTop 目标高度
 * @param {function} callback 完成滚动回调
 * @param {number} duration 滚动动画时间（默认300ms）
 * @param {number} moveInterval 滚动移动间隔（默认10ms）
 * @return {{stop:function}} 返回动画帧定时器绑定对象，调用stop可停止动画
 */
export function elementScrollTo(
  element,
  targetScrollTop,
  callback,
  duration = 300,
  moveInterval = 10
) {
  targetScrollTop = Math.max(0, targetScrollTop);
  let curScrollTop = element.scrollTop; // 当前scrollTop
  let distance = targetScrollTop - curScrollTop; //滚动距离
  let step = Math.round(distance / (duration / moveInterval)); // 步进，将距离细分为n小段，10ms滚动一次
  if (step == 0) {
    if (distance < 0) step = -1;
    else step = 1;
  }
  let bind = {
    _scrollTimer: null,
    stop() {
      clearTimeout(this._scrollTimer);
    },
  };
  startAnimation();
  function startAnimation() {
    // 距离目标小于步进时，直接到达终点
    if (Math.abs(targetScrollTop - curScrollTop) <= Math.abs(step)) {
      element.scrollTop = targetScrollTop;
      if (callback && typeof callback === "function") {
        callback();
      }
    } else {
      curScrollTop += step;
      element.scrollTop = curScrollTop;
      bind._scrollTimer = setTimeout(() => startAnimation(), 10);
    }
  }
  return bind;
}

/**
 * 成功信息
 */
export function _success(mes) {
  Message({
    message: mes,
    type: "success",
    duration: 1000,
  });
}

/**
 * 警告信息
 */
export function _warn(mes) {
  Message({
    message: mes,
    type: "warning",
  });
}

/**
 * 异常信息
 */
export function _err(mes, e) {
  console.error(mes, e);
  Notification({
    title: "错误",
    message: mes + " " + e,
    type: "error",
  });
}

/**
 * 弹窗html内容提示确认
 */
export function _confirmHtml(html, otherOption = {}) {
  return MessageBox.confirm(html, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
    dangerouslyUseHTMLString: true, // 渲染html
    ...otherOption,
  });
}

/**
 * 弹窗输入框提示确认
 * @param {string} title 输入框标题
 * @param {string} inputValue 输入框默认内容
 * @param {object} otherOption 其他MessageBox.prompt option参数
 */
export function _prompt(title, inputValue, otherOption = {}) {
  return MessageBox.prompt(title, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    inputValue,
    ...otherOption,
  }).then(({ value }) => value);
}

/**
 * 保存字符串为txt文件
 * @param {string} content 内容字符串
 * @param {string} fileName 文件名
 * @param {string} fileSuffix 文件后缀
 */
export function saveAsTxt(content, fileName = "默认", fileSuffix = "txt") {
  saveAs(new Blob([content], { type: "text/plain;charset=utf-8" }), fileName + "." + fileSuffix);
}

/**
 * 生成 黑白图
 * @param {number} threshold 阈值(0 - 255)
 * @param {boolean} isMonitor 是否流速器（流速器颜色表中没有黑色，最深色号为#030303）
 */
export function handleBlackWhite(imgData, threshold, isMonitor = false) {
  for (let i = 0; i < imgData.data.length; i += 4) {
    // 获取灰度
    var gray = getGray(imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]);
    // 基于阈值转为黑白
    if (gray > threshold) {
      imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = 255;
    } else {
      imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = isMonitor ? 3 : 0;
    }
  }
}

/**
 * 生成 灰度图
 * @param {number} contrast 对比度(-255 - 255)
 * @param {number} brightness 亮度度(-255 - 255)
 */
export function handleGray(imgData, contrast, brightness) {
  const d = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < imgData.data.length; i += 4) {
    // 转为灰度图
    var gray = getGray(imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]);
    // 调整对比度
    if (contrast != 0) {
      gray = truncateColor((gray - 128) * d + 128);
    }
    // 调整亮度
    if (brightness != 0) {
      gray = truncateColor(gray + brightness);
    }
    imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = gray;
  }
}

/** 根据二分法找到升序数组中，最接近传入值的数字 */
function findClosestNum(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  while (right - left > 1) {
    let mid = Math.floor((left + right) / 2);
    if (arr[mid] < target) {
      left = mid;
    } else {
      right = mid;
    }
  }
  if (target - arr[left] <= arr[right] - target) {
    return arr[left];
  }
  return arr[right];
}

/**
 * 根据 流速器灰度颜色表索引 生成灰度图
 * @param {number} contrast 对比度(-255 - 255)
 * @param {number} brightness 亮度度(-255 - 255)
 */
export function handleMonitorGray(imgData, contrast, brightness) {
  const d = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < imgData.data.length; i += 4) {
    // 转为灰度图
    var gray = getGray(imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]);
    // 调整对比度
    if (contrast != 0) {
      gray = truncateColor((gray - 128) * d + 128);
    }
    // 调整亮度
    if (brightness != 0) {
      gray = truncateColor(gray + brightness);
    }
    if (gray === 0) {
      // 优化匹配黑色效率（流速器颜色表中没有黑色，最深色号为#030303）
      gray = 3;
    } else if (!Object.prototype.hasOwnProperty.call(grayColorIndexMap, gray)) {
      // 流速器灰度中没有匹配的灰度，则找到最接近的灰度
      gray = findClosestNum(grayColorIndexs, gray);
    }
    imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = gray;
  }
}

/** 计算两个颜色之间的欧几里得距离 */
function colorDistance([r1, g1, b1], [r2, g2, b2]) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}
/** 找到颜色表中最接近目标颜色的颜色索引 */
function closestColorIndex([r, g, b]) {
  let colorIndex = null;
  let minDistance = Infinity;
  for (let i = 0; i < rgbColor.length; i++) {
    const rgb = rgbColor[i];
    let distance = colorDistance([r, g, b], rgb);
    if (distance < minDistance) {
      minDistance = distance;
      colorIndex = i;
    }
  }
  return colorIndex;
}

/**
 * 根据 流速器全颜色表索引 生成仿色（欧几里得距离）
 * @param {number} contrast 对比度(-255 - 255)
 * @param {number} brightness 亮度度(-255 - 255)
 */
export async function handleMonitorColorEuclid(imgData, contrast, brightness, _progress) {
  const d = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < imgData.data.length; i += 4) {
    await _progress(() => {
      let [r, g, b] = [imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]];
      // 调整对比度
      if (contrast != 0) {
        r = truncateColor((r - 128) * d + 128);
        g = truncateColor((g - 128) * d + 128);
        b = truncateColor((b - 128) * d + 128);
      }
      // 调整亮度
      if (brightness != 0) {
        r = truncateColor(r + brightness);
        g = truncateColor(g + brightness);
        b = truncateColor(b + brightness);
      }
      // 找到颜色表中最接近目标颜色的颜色索引
      const colorIndex = closestColorIndex([r, g, b]);
      [imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]] = rgbColor[colorIndex];
    }, Math.round((i / imgData.data.length) * 100));
  }
}

/**
 * 计算灰度
 */
function getGray(r, g, b) {
  return Math.pow(
    Math.pow(r, 2.2) * 0.2973 + Math.pow(g, 2.2) * 0.6274 + Math.pow(b, 2.2) * 0.0753,
    1 / 2.2
  );
}

function truncateColor(value) {
  if (value < 0) value = 0;
  else if (value > 255) value = 255;
  return value;
}

/**
 * @typedef {Object} BuildingItem
 * @property {number} index - 建筑索引
 * @property {[{x,y,z},{x,y,z}]} localOffset - 建筑偏移
 * @property {number} outputObjIdx - 输出对象索引
 * @property {number} outputToSlot - 输出对象插槽索引
 * @property {number} inputObjIdx - 输入对象索引
 * @property {number} inputFromSlot - 输入对象插槽索引
 * @property {number} filterId - 过滤物品id
 * @property {BuildingItem[]} _belts - (临时属性) 关联传送带建筑对象
 * @property {number[]} _slotsBeltIdx - (临时属性) 插槽外接的传送带建筑对象索引
 * @property {{priority,iconId,count}} parameters - 建筑属性
 */

/**
 * 根据配置生成蓝图对象
 * @param {ImageData} imgData 图片数据
 * @param {SettingForm} config 生成配置
 */
export async function generateBlueprint(imgData, config, _progress) {
  const blueprint = {
    header: {
      layout: 10,
      icons: [0, 0, 0, 0, 0],
      time: new Date(),
      gameVersion: 0,
      shortDesc: config.name,
      desc: `本蓝图通过[DSP物流绘图生成器]生成！\n作者b站id：晨隐_`,
    },
    version: 1,
    cursorOffset: { x: 0, y: 0 },
    cursorTargetArea: 0,
    dragBoxSize: { x: 1, y: 1 },
    primaryAreaIdx: 0,
    areas: [
      {
        index: 0,
        parentIndex: -1,
        tropicAnchor: 0,
        areaSegments: 200,
        anchorLocalOffset: { x: 0, y: 0 },
        size: { x: 1, y: 1 },
      },
    ],
  };
  blueprint.buildings = await createbuildings(imgData, config, _progress);
  return blueprint;
}

/**
 * 根据配置生成蓝图建筑列表
 * @param {ImageData} imgData 图片数据
 * @param {SettingForm} config 生成配置
 */
function createbuildings(imgData, config, _progress) {
  const generateMode = config.form.generateMode;
  const renderMode = config.form.renderMode;
  if (generateMode === "belt_tilt") {
    return [];
  } else if (generateMode === "monitor") {
    if (renderMode === "monitor_bw" || renderMode === "monitor_gray") {
      return generateMonitorGrayScreen(imgData, config, _progress);
    } else if (renderMode === "monitor_color_euclid") {
      return generateMonitorColorScreen(imgData, config, _progress);
    }
  }
  return [];
}

/**
 * 生成流速器灰度屏
 */
async function generateMonitorGrayScreen(imgData, config, _progress) {
  let buildings = [];
  let index = 0;
  for (let i = 0; i < imgData.data.length; i += 4) {
    await _progress(() => {
      let x = config.width - ((i / 4) % config.width) - 1;
      let y = Math.floor(i / 4 / config.width);
      let gray = imgData.data[i];
      let colorIndex;
      if (grayColorIndexMap.has(gray)) {
        colorIndex = grayColorIndexMap.get(gray);
      } else {
        // 流速器灰度表中没有匹配的灰度，则找到最接近的灰度
        colorIndex = grayColorIndexMap.get(findClosestNum(grayColorIndexs, gray));
      }
      buildings.push(
        createMonitor({ index: index++, offset: [x, y, config.form.z], colorId: colorIndex })
      );
      buildings.push(createBelt({ index: index++, offset: [x, y, config.form.z] }));
    }, Math.round((i / imgData.data.length) * 100));
  }
  return buildings;
}

/**
 * 生成流速器彩色屏
 */
async function generateMonitorColorScreen(imgData, config, _progress) {
  let buildings = [];
  let index = 0;
  for (let i = 0; i < imgData.data.length; i += 4) {
    await _progress(() => {
      let x = config.width - ((i / 4) % config.width) - 1;
      let y = Math.floor(i / 4 / config.width);
      let [r, g, b] = imgData.data.slice(i, i + 3);
      let hex = rgbToHex(r, g, b);
      let colorIndex;
      if (colorIndexMap.has(hex)) {
        colorIndex = colorIndexMap.get(hex);
      } else {
        // 流速器颜色表中没有直接匹配的颜色，则找到最接近的颜色
        colorIndex = closestColorIndex([r, g, b]);
      }
      buildings.push(
        createMonitor({ index: index++, offset: [x, y, config.form.z], colorId: colorIndex })
      );
      buildings.push(createBelt({ index: index++, offset: [x, y, config.form.z] }));
    }, Math.round((i / imgData.data.length) * 100));
  }
  return buildings;
}

/**
 * 创建传送带
 * @param {Object} opt
 * @param {number} opt.index 索引
 * @param {number[]} opt.offset 偏移 [x,y,z]
 * @param {number[]} opt.prevBeltIdx 上一个传送带索引（输入）
 * @param {number[]} opt.nextBeltIdx 下一个传送带索引（输出）
 * @return {BuildingItem}
 */
export function createBelt({
  index = 0,
  offset: [x = 0, y = 0, z = 0] = [],
  prevBeltIdx = -1,
  nextBeltIdx = -1,
} = {}) {
  return {
    index,
    areaIndex: 0,
    localOffset: [
      { x, y, z },
      { x, y, z },
    ],
    yaw: [0, 0],
    itemId: 2003, // 蓝带
    modelIndex: 37,
    outputObjIdx: nextBeltIdx,
    outputToSlot: 0,
    inputObjIdx: prevBeltIdx,
    inputFromSlot: 0,
    outputFromSlot: 0,
    inputToSlot: 1,
    outputOffset: 0,
    inputOffset: 0,
    recipeId: 0,
    filterId: 0,
    parameters: null,
  };
}

/**
 * 创建流速器
 * @param {Object} opt
 * @param {number} opt.index 索引
 * @param {number[]} opt.offset 偏移 [x,y,z]
 * @param {number} opt.colorId 	不满足条件颜色索引(默认红色13)（0 - 255）
 * @return {BuildingItem}
 */
export function createMonitor({
  index = 0,
  offset: [x = 0, y = 0, z = 0] = [],
  colorId = 13,
} = {}) {
  return {
    index: index,
    areaIndex: 0,
    localOffset: [
      { x, y, z },
      { x, y, z },
    ],
    yaw: [0, 0],
    itemId: 2030,
    modelIndex: 208,
    outputObjIdx: -1,
    inputObjIdx: -1,
    outputToSlot: 0,
    inputFromSlot: 0,
    outputFromSlot: 0,
    inputToSlot: 0,
    outputOffset: 0,
    inputOffset: 0,
    recipeId: 0,
    filterId: 0,
    parameters: {
      targetBeltId: 23343,
      offset: 0,
      periodTicksCount: 60,
      passOperator: 0, // =30
      targetCargoAmount: 30,
      passColorId: 0,
      failColorId: colorId,
      cargoFilter: 0,
      spawnItemOperator: 0,
      systemWarningMode: 0,
      systemWarningIconId: 402,
      alarmMode: 0,
      tone: 20,
      falloffRadius: [24, 72],
      repeat: true,
      pitch: 35,
      volume: 80,
      length: 4,
    },
  };
}
