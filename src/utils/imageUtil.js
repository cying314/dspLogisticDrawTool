import * as Util from "./index.js";
import html2canvas from "./html2canvas";
import { grayColorIndexMap, grayColorIndexs, rgbColor } from "@/data/monitorColor.js";

/**
 * 根据文本生成base64图片
 */
export async function textToBase64({
  content = "",
  textAlign = "center",
  fontSize = 9,
  lineHeight,
  color = "#000",
  fontFamily = "microsoft yahei",
} = {}) {
  lineHeight ??= fontSize + 1;
  const span = document.createElement("span");
  span.textContent = content;
  span.style.textAlign = textAlign;
  span.style.fontSize = fontSize + "pt";
  span.style.lineHeight = lineHeight + "pt";
  span.style.color = color;
  span.style.fontFamily = "'" + fontFamily + "'";

  span.style.whiteSpace = "pre";
  span.style.position = "fixed";
  // 解决文本顶部被截断的问题
  let space = fontSize / 6 + "pt";
  span.style.padding = ` ${space} 0 0 0`;

  document.body.appendChild(span);
  try {
    const canvas = await html2canvas(span, {
      scale: 1,
    });
    return canvas.toDataURL();
  } finally {
    document.body.removeChild(span);
  }
}

/**
 * 根据配置处理图像渲染
 * @param {number[]} imgData 图像数据
 * @param {SettingForm} settingForm 配置项
 * @param {function} _progress 异步进度条回调
 */
export function renderImageData(imgData, settingForm, _progress) {
  const renderMode = settingForm.renderMode;
  if (renderMode == "bw") {
    return handleBlackWhite(imgData, settingForm, _progress);
  } else if (renderMode == "gray") {
    return handleGray(imgData, settingForm, _progress);
  } else if (renderMode == "monitor_bw") {
    return handleMonitorBlackWhite(imgData, settingForm, _progress);
  } else if (renderMode == "monitor_gray") {
    return handleMonitorGray(imgData, settingForm, _progress);
  } else if (renderMode == "monitor_color_euclid") {
    return handleMonitorColorEuclid(imgData, settingForm, _progress);
  }
}

/**
 * 生成 黑白图
 * @param {number[]} imgData 图像数据
 * @param {Object} params
 * @param {number} params.threshold 阈值(0 - 255)
 * @param {boolean} params.inversionColor 是否反色
 */
export async function handleBlackWhite(imgData, { threshold, inversionColor }, _progress) {
  for (let i = 0; i < imgData.data.length; i += 4) {
    await _progress(
      () => {
        // 获取灰度
        var gray = getGray(imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]);
        // 反色
        if (inversionColor) {
          gray = 255 - gray;
        }
        // 基于阈值转为黑白
        imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = gray > threshold ? 255 : 0;
      },
      Math.round((i / imgData.data.length) * 100),
      10
    );
  }
}

/**
 * 生成 灰度图
 * @param {number[]} imgData 图像数据
 * @param {Object} params
 * @param {number} params.contrast 对比度(-255 - 255)
 * @param {number} params.brightness 亮度(-255 - 255)
 * @param {boolean} params.inversionColor 是否反色
 */
export async function handleGray(imgData, { contrast, brightness, inversionColor }, _progress) {
  const d = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < imgData.data.length; i += 4) {
    await _progress(() => {
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
      // 反色
      if (inversionColor) {
        gray = 255 - gray;
      }
      imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = gray;
    }, Math.round((i / imgData.data.length) * 100));
  }
}

/**
 * 生成 黑白图（流速器）
 * @param {number[]} imgData 图像数据
 * @param {Object} params
 * @param {number} params.threshold 阈值(0 - 255)
 * @param {number} params.brightness 亮度(-255 - 255)
 * @param {boolean} params.inversionColor 是否反色
 */
export async function handleMonitorBlackWhite(
  imgData,
  { threshold, brightness, inversionColor },
  _progress
) {
  for (let i = 0; i < imgData.data.length; i += 4) {
    await _progress(
      () => {
        // 获取灰度
        var gray = getGray(imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]);
        // 基于阈值转为黑白
        gray = gray > threshold ? 255 : 0;
        // 调整亮度
        if (brightness != 0) {
          gray = truncateColor(gray + brightness);
        }
        // 反色
        if (inversionColor) {
          gray = 255 - gray;
        }
        // 转为颜色表中的灰度
        gray = findClosestGary(gray);
        imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = gray;
      },
      Math.round((i / imgData.data.length) * 100),
      10
    );
  }
}

/**
 * 根据 流速器灰度颜色表索引 生成灰度图
 * @param {number[]} imgData 图像数据
 * @param {Object} params
 * @param {number} params.contrast 对比度(-255 - 255)
 * @param {number} params.brightness 亮度(-255 - 255)
 * @param {boolean} params.inversionColor 是否反色
 */
export async function handleMonitorGray(
  imgData,
  { contrast, brightness, inversionColor },
  _progress
) {
  const d = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < imgData.data.length; i += 4) {
    await _progress(
      () => {
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
        // 反色
        if (inversionColor) {
          gray = 255 - gray;
        }
        // 转为颜色表中的灰度
        gray = findClosestGary(gray);
        imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = gray;
      },
      Math.round((i / imgData.data.length) * 100),
      10
    );
  }
}

/**
 * 转为流速器灰度颜色表中最接近的灰度
 */
export function findClosestGary(gray) {
  if (gray === 0) {
    // 优化匹配黑色效率（流速器颜色表中没有黑色，最深色号为#030303）
    return 3;
  } else if (grayColorIndexMap.has(gray)) {
    return gray;
  } else {
    // 没有匹配的灰度，则找到最接近的灰度
    return Util.findClosestNum(grayColorIndexs, gray);
  }
}

/** 计算两个颜色之间的欧几里得距离 */
function colorDistance([r1, g1, b1], [r2, g2, b2]) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}
/** 找到颜色表中最接近目标颜色的颜色索引 */
export function closestColorIndex([r, g, b]) {
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
 * @param {number[]} imgData 图像数据
 * @param {Object} params
 * @param {number} params.hueShift 色相偏移(-180 - 180)
 * @param {number} params.contrast 对比度(-255 - 255)
 * @param {number} params.brightness 亮度(-255 - 255)
 * @param {boolean} params.inversionColor 是否反色
 */
export async function handleMonitorColorEuclid(
  imgData,
  { hueShift, contrast, brightness, inversionColor },
  _progress
) {
  const d = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < imgData.data.length; i += 4) {
    await _progress(() => {
      let [r, g, b] = [imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]];
      // 色相偏移
      if (hueShift != 0) {
        let [h, s, l] = rgbToHsl(r, g, b);
        h = (h + hueShift + 360) % 360;
        [r, g, b] = hslToRgb(h, s, l);
      }
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
      // 反色
      if (inversionColor) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
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

export function hexToRgb(hex) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export function rgbToHsl(r, g, b) {
  r = r / 255;
  g = g / 255;
  b = b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  var d, h, s;

  if (max !== min) {
    d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h = h / 6;
  } else {
    h = s = 0;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * @param {number} h 色相 0-360
 * @param {number} s 饱和度 0-100
 * @param {number} l 亮度 0-100
 */
export function hslToRgb(h, s, l) {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  var v, min, sv, six, fract, vsfract, r, g, b;
  if (l <= 0.5) {
    v = l * (1 + s);
  } else {
    v = l + s - l * s;
  }
  if (v === 0) {
    return [0, 0, 0];
  }
  min = 2 * l - v;
  sv = (v - min) / v;
  h = 6 * h;
  six = Math.floor(h);
  fract = h - six;
  vsfract = v * sv * fract;
  switch (six) {
    case 1:
      r = v - vsfract;
      g = v;
      b = min;
      break;
    case 2:
      r = min;
      g = v;
      b = min + vsfract;
      break;
    case 3:
      r = min;
      g = v - vsfract;
      b = v;
      break;
    case 4:
      r = min + vsfract;
      g = min;
      b = v;
      break;
    case 5:
      r = v;
      g = min;
      b = v - vsfract;
      break;
    default:
      r = v;
      g = min + vsfract;
      b = min;
      break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
