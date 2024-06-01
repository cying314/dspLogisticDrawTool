import * as ImageUtil from "./imageUtil.js";
import { grayColorIndexMap, colorIndexMap, rgbToHex } from "@/data/monitorColor.js";

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
      let x = (config.width - ((i / 4) % config.width) - 1) * config.form.space;
      let y = Math.floor(i / 4 / config.width) * config.form.space;
      let gray = imgData.data[i];
      // 转为颜色表中的灰度
      gray = ImageUtil.findClosestGary(gray);
      // 转为颜色索引
      let colorIndex = grayColorIndexMap.get(gray);
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
      let x = (config.width - ((i / 4) % config.width) - 1) * config.form.space;
      let y = Math.floor(i / 4 / config.width) * config.form.space;
      let [r, g, b] = imgData.data.slice(i, i + 3);
      let hex = rgbToHex(r, g, b);
      let colorIndex;
      if (colorIndexMap.has(hex)) {
        colorIndex = colorIndexMap.get(hex);
      } else {
        // 流速器颜色表中没有直接匹配的颜色，则找到最接近的颜色
        colorIndex = ImageUtil.closestColorIndex([r, g, b]);
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
