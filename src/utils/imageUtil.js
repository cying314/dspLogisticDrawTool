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
  span.style.fontFamily = fontFamily;

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
 * 生成 黑白图
 * @param {number} threshold 阈值(0 - 255)
 */
export async function handleBlackWhite(imgData, threshold, _progress) {
  for (let i = 0; i < imgData.data.length; i += 4) {
    await _progress(
      () => {
        // 获取灰度
        var gray = getGray(imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]);
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
 * @param {number} contrast 对比度(-255 - 255)
 * @param {number} brightness 亮度度(-255 - 255)
 */
export async function handleGray(imgData, contrast, brightness, _progress) {
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
      imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = gray;
    }, Math.round((i / imgData.data.length) * 100));
  }
}

/**
 * 生成 黑白图（流速器）
 * @param {number} threshold 阈值(0 - 255)
 * @param {number} brightness 亮度度(-255 - 255)
 */
export async function handleMonitorBlackWhite(imgData, threshold, brightness, _progress) {
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
 * @param {number} contrast 对比度(-255 - 255)
 * @param {number} brightness 亮度度(-255 - 255)
 */
export async function handleMonitorGray(imgData, contrast, brightness, _progress) {
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
