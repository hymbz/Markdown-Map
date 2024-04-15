import {
  type Accessor,
  createEffect,
  createMemo,
  createRoot,
  createSignal,
  getOwner,
  on,
} from 'solid-js';
import {
  type ScheduleCallback,
  debounce as _debounce,
  throttle as _throttle,
  leadingAndTrailing,
} from '@solid-primitives/scheduled';
import isEqual from 'fast-deep-equal/es6/index.js';
import _scrollIntoView from 'scroll-into-view-if-needed';

export { default as isEqual } from 'fast-deep-equal/es6/index.js';

export const throttle: ScheduleCallback = (fn, wait = 100) =>
  leadingAndTrailing(_throttle, fn, wait);

export const debounce: ScheduleCallback = (fn, wait = 100) =>
  _debounce(fn, wait);

/** 会自动设置 equals 的 createSignal */
export const createEqualsSignal = ((init: any, options?: any) =>
  createSignal(init, { equals: isEqual, ...options })) as typeof createSignal;

/** 会自动设置 equals 和 createRoot 的 createMemo */
export const createRootMemo = ((fn: any, init?: any, options?: any) => {
  const _init = init ?? fn(undefined);
  // 自动为对象类型设置 equals
  const _options =
    options?.equals === undefined && typeof init === 'object'
      ? { ...options, equals: isEqual }
      : options;

  return getOwner()
    ? createMemo(fn, _init, _options)
    : createRoot(() => createMemo(fn, _init, _options));
}) as typeof createMemo;

export function createMemoMap<Return extends Record<string, any>>(fnMap: {
  [P in keyof Return]: Accessor<Return[P]>;
}) {
  const memoMap = Object.fromEntries(
    Object.entries(fnMap).map(([key, fn]) => {
      // 如果函数已经是 createMemo 创建的，就直接使用
      if (fn.name === 'bound readSignal') return [key, fn];
      return [key, createRootMemo(fn, undefined)];
    }),
  ) as typeof fnMap;

  const map = createRootMemo(() => {
    const obj = {} as Return;
    for (const key of Object.keys(memoMap))
      Reflect.set(obj, key, memoMap[key]());
    return obj;
  });
  return map;
}

export const createEffectOn = ((deps: any, fn: any, options?: any) =>
  getOwner()
    ? createEffect(on(deps, fn, options))
    : createRoot(() => createEffect(on(deps, fn, options)))) as typeof on;

/** 将指定的布尔值转换为字符串或未定义 */
export const boolDataVal = (val: boolean) => (val ? '' : undefined);

/** 判断两个数是否在指定误差范围内相等 */
export const approx = (val: number, target: number, range: number) =>
  Math.abs(target - val) <= range;

/** 提取指定正则匹配的文本 */
export const extractText = (
  text: string,
  re: RegExp,
  replacer?: (substring: string, ...args: Array<string | undefined>) => unknown,
) =>
  (re.flags.includes('g') ? text.replaceAll : text.replace).call(
    text,
    re,
    (searchValue: string, replaceValue: string) => {
      replacer?.(searchValue, replaceValue);
      return '';
    },
  );

export const sleep = async (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

/** 将 blob 数据作为文件保存至本地 */
export const saveAs = (blob: Blob, name = 'download') => {
  const a = document.createElementNS(
    'http://www.w3.org/1999/xhtml',
    'a',
  ) as HTMLAnchorElement;
  a.download = name;
  a.rel = 'noopener';
  a.href = URL.createObjectURL(blob);
  setTimeout(() => a.dispatchEvent(new MouseEvent('click')));
};

type TrueValue<T> = Exclude<T, void | false | undefined>;

/** 等到传入的函数返回 true */
export const wait = async <T>(
  fn: () => T | undefined | Promise<T | undefined>,
  timeout = Number.POSITIVE_INFINITY,
): Promise<TrueValue<T>> => {
  let res: T | undefined = await fn();
  let _timeout = timeout;
  while (_timeout > 0 && !res) {
    await sleep(10);
    _timeout -= 10;
    res = await fn();
  }

  return res as TrueValue<T>;
};

/**
 * 限制 Promise 并发
 * @param fnList 任务函数列表
 * @param callBack 成功执行一个 Promise 后调用，主要用于显示进度
 * @param limit 限制数
 * @returns 所有 Promise 的返回值
 */
export const plimit = async <T>(
  fnList: Array<() => Promise<T> | T>,
  callBack = undefined as
    | ((doneNum: number, totalNum: number, resList: T[], i: number) => void)
    | undefined,
  limit = 10,
) => {
  let doneNum = 0;
  const totalNum = fnList.length;
  const resList: T[] = [];
  const execPool = new Set<Promise<void>>();
  const taskList = fnList.map((fn, i) => {
    let p: Promise<void>;
    return () => {
      p = (async () => {
        resList[i] = await fn();
        doneNum += 1;
        execPool.delete(p);
        callBack?.(doneNum, totalNum, resList, i);
      })();
      execPool.add(p);
    };
  });

  // eslint-disable-next-line no-unmodified-loop-condition
  while (doneNum !== totalNum) {
    while (taskList.length > 0 && execPool.size < limit) taskList.shift()!();
    await Promise.race(execPool);
  }

  return resList;
};

/** 使指定函数在同意时间只会运行一个 */
export const singleThread = <T extends any[], R>(
  callback: (...args: T) => R | Promise<R>,
) => {
  let running = false;

  const fn = async (...args: T) => {
    if (running) return;

    try {
      running = true;
      return await callback(...args);
    } catch (error) {
      await sleep(100);
      throw error;
    } finally {
      running = false;
    }
  };

  return fn;
};

/** 获取图片尺寸 */
export const getImgSize = async (
  url: string,
): Promise<[number, number] | undefined> => {
  let error = false;
  const image = new Image();
  try {
    image.onerror = () => {
      error = true;
    };

    image.src = url;

    await wait(() => error || image.naturalWidth || image.naturalHeight);
    if (error) return;
    return [image.naturalWidth, image.naturalHeight];
  } catch (error_) {
    console.error(error_);
    return;
  } finally {
    image.src = '';
  }
};

export const scrollIntoView = (
  element: HTMLElement,
  block: ScrollLogicalPosition = 'start',
  options?: ScrollIntoViewOptions,
) =>
  _scrollIntoView(element, {
    scrollMode: 'if-needed',
    behavior: 'smooth',
    block,
    ...options,
  });

/** 获取 url 的扩展名 */
export const getExtName = (url: string) => /\.([^.]+)(?=\?|$)/.exec(url)?.[1];

/** 深拷贝对象 */
export const cloneDeep = <T extends object>(data: T) =>
  JSON.parse(JSON.stringify(data)) as T;
