import { Notification, Message, MessageBox } from "element-ui";
import { saveAs } from "file-saver";

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

/** 根据二分法找到升序数组中，最接近传入值的数字 */
export function findClosestNum(arr, target) {
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

