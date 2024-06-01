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
  if (generateMode === "belt_horiz") {
    if (renderMode == "bw") {
      return generateHorizBeltBWScreen(imgData, config, _progress);
    } else if (renderMode == "gray") {
      return generateHorizBeltGrayScreen(imgData, config, _progress);
    }
  } else if (generateMode === "belt_verti") {
    return [];
    // return generateVertiBeltScreen(imgData, config, _progress);
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
 * 水平灰度带屏
 */
async function generateHorizBeltGrayScreen(imgData, config, _progress) {
  let buildings = [];
  const width = +config.width;
  const height = +config.height;
  const space = +config.form.space;
  const z = +config.form.z;
  let index = 0;
  for (let i = 0; i < imgData.data.length; i += 4) {
    await _progress(() => {
      let x = width - ((i / 4) % width) - 1;
      let y = Math.floor(i / 4 / width);
      let gray = imgData.data[i];
      let tilt = 179 - Math.round((gray / 255) * 90);
      let nextBeltIdx;
      if (x % 2 == 0) {
        if (y == 0) {
          nextBeltIdx = x == width - 1 ? -1 : index - 1;
        } else {
          nextBeltIdx = index - width;
        }
      } else {
        if (y == height - 1) {
          nextBeltIdx = x == width - 1 ? -1 : index - 1;
        } else {
          nextBeltIdx = index + width;
        }
      }
      buildings.push(
        createBelt({
          index: index++,
          offset: [x * space, y * space, z],
          tilt,
          nextBeltIdx,
        })
      );
    }, Math.round((i / imgData.data.length) * 100));
  }
  return buildings;
}

/**
 * 水平黑白二值化带屏
 */
async function generateHorizBeltBWScreen(imgData, config, _progress) {
  let buildings = [];
  const width = +config.width;
  const height = +config.height;
  const space = +config.form.space;
  const z = +config.form.z;

  const fixBoundary = config.form.fixBoundary;
  let fixBuildings = [];
  let fixIndex = imgData.data.length / 4;
  const fixDis = Math.min(0.125, (space - 0.25) / 2); // 边界两点距离/2

  let index = 0;
  for (let i = 0; i < imgData.data.length; i += 4) {
    await _progress(() => {
      let x = width - ((i / 4) % width) - 1;
      let y = Math.floor(i / 4 / width);
      let gray = imgData.data[i];
      let tilt = gray > 128 ? 0 : 179;
      let nextBeltIdx;
      if (x % 2 == 0) {
        if (y == 0) {
          nextBeltIdx = x == width - 1 ? -1 : index - 1;
        } else {
          nextBeltIdx = index - width;
        }
      } else {
        if (y == height - 1) {
          nextBeltIdx = x == width - 1 ? -1 : index - 1;
        } else {
          nextBeltIdx = index + width;
        }
      }

      // 优化边缘
      if (fixBoundary) {
        let topIndex = i - width * 4;
        if (topIndex >= 0) {
          // 判断竖直方向上的颜色交界
          let topTilt = imgData.data[topIndex] > 128 ? 0 : 179;
          if (topTilt != tilt) {
            // 交界的像素中间插两个传送带
            let fixNext;
            if (x % 2 == 0) {
              fixNext = nextBeltIdx;
              nextBeltIdx = fixIndex;
              fixBuildings.push(
                createBelt({
                  index: fixIndex++,
                  offset: [x * space, y * space - space / 2 + fixDis, z],
                  tilt,
                  nextBeltIdx: fixIndex,
                })
              );
              fixBuildings.push(
                createBelt({
                  index: fixIndex++,
                  offset: [x * space, y * space - space / 2 - fixDis, z],
                  tilt: topTilt,
                  nextBeltIdx: fixNext,
                })
              );
            } else {
              buildings[index - width].outputObjIdx = fixIndex;
              fixNext = index;
              fixBuildings.push(
                createBelt({
                  index: fixIndex++,
                  offset: [x * space, y * space - space / 2 - fixDis, z],
                  tilt: topTilt,
                  nextBeltIdx: fixIndex,
                })
              );
              fixBuildings.push(
                createBelt({
                  index: fixIndex++,
                  offset: [x * space, y * space - space / 2 + fixDis, z],
                  tilt,
                  nextBeltIdx: fixNext,
                })
              );
            }
          }
        }
      }

      buildings.push(
        createBelt({
          index: index++,
          offset: [x * space, y * space, z],
          tilt,
          nextBeltIdx,
        })
      );
    }, Math.round((i / imgData.data.length) * 100));
  }
  if (config.form.fixBoundary) {
    buildings.push(...fixBuildings);
  }
  return buildings;
}

/**
 * 垂直带屏
 */
// async function generateVertiBeltScreen(imgData, config, _progress) {}

/**
 * 生成流速器灰度屏
 */
async function generateMonitorGrayScreen(imgData, config, _progress) {
  let buildings = [];
  const width = +config.width;
  const space = +config.form.space;
  const z = +config.form.z;
  let index = 0;
  for (let i = 0; i < imgData.data.length; i += 4) {
    await _progress(() => {
      let x = (width - ((i / 4) % width) - 1) * space;
      let y = Math.floor(i / 4 / width) * space;
      let gray = imgData.data[i];
      // 转为颜色表中的灰度
      gray = ImageUtil.findClosestGary(gray);
      // 转为颜色索引
      let colorIndex = grayColorIndexMap.get(gray);
      buildings.push(createMonitor({ index: index++, offset: [x, y, z], colorId: colorIndex }));
      buildings.push(createBelt({ index: index++, offset: [x, y, z] }));
    }, Math.round((i / imgData.data.length) * 100));
  }
  return buildings;
}

/**
 * 生成流速器彩色屏
 */
async function generateMonitorColorScreen(imgData, config, _progress) {
  let buildings = [];
  const width = +config.width;
  const space = +config.form.space;
  const z = +config.form.z;
  let index = 0;
  for (let i = 0; i < imgData.data.length; i += 4) {
    await _progress(() => {
      let x = (width - ((i / 4) % width) - 1) * space;
      let y = Math.floor(i / 4 / width) * space;
      let [r, g, b] = imgData.data.slice(i, i + 3);
      let hex = rgbToHex(r, g, b);
      let colorIndex;
      if (colorIndexMap.has(hex)) {
        colorIndex = colorIndexMap.get(hex);
      } else {
        // 流速器颜色表中没有直接匹配的颜色，则找到最接近的颜色
        colorIndex = ImageUtil.closestColorIndex([r, g, b]);
      }
      buildings.push(createMonitor({ index: index++, offset: [x, y, z], colorId: colorIndex }));
      buildings.push(createBelt({ index: index++, offset: [x, y, z] }));
    }, Math.round((i / imgData.data.length) * 100));
  }
  return buildings;
}

/**
 * 创建传送带
 * @param {Object} opt
 * @param {number} opt.index 索引
 * @param {number[]} opt.offset 偏移 [x,y,z]
 * @param {number[]} opt.tilt 倾斜
 * @param {number[]} opt.nextBeltIdx 下一个传送带索引（输出）
 * @return {BuildingItem}
 */
export function createBelt({
  index = 0,
  offset: [x = 0, y = 0, z = 0] = [],
  tilt = 0,
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
    tilt: tilt,
    itemId: 2003, // 蓝带
    modelIndex: 37,
    outputObjIdx: nextBeltIdx,
    outputToSlot: nextBeltIdx == -1 ? 0 : 1,
    inputObjIdx: -1,
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
    tilt: 0,
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
