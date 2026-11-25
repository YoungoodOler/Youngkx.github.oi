---
title: "二叉堆（Binary Heap）"
excerpt: "讲解堆序、上浮下沉、线性建堆和 priority_queue 的选择，用小根堆维护前 k 大。"
---

[← 返回数据结构总览](../)

## 1. 形状和顺序分开看

二叉堆的形状是完全二叉树。除最后一层外每层都满，最后一层从左向右填。大根堆要求每个父节点不小于孩子，小根堆要求每个父节点不大于孩子。整棵树的最值位于根，兄弟节点及不同子树之间没有整体顺序。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 188" role="img" aria-label="大根堆及其按层排列的数组" fill="currentColor">
    <path d="M207 30 L160 49" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M233 30 L280 49" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M137 67 L99 89" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M160 67 L197 89" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <circle cx="220" cy="21" r="14" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="220" y="22" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">9</text>
    <circle cx="149" cy="57" r="14" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="149" y="58" text-anchor="middle" dominant-baseline="middle" font-size="14">7</text>
    <circle cx="291" cy="57" r="14" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="291" y="58" text-anchor="middle" dominant-baseline="middle" font-size="14">6</text>
    <circle cx="88" cy="98" r="14" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="88" y="99" text-anchor="middle" dominant-baseline="middle" font-size="14">4</text>
    <circle cx="209" cy="98" r="14" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="209" y="99" text-anchor="middle" dominant-baseline="middle" font-size="14">5</text>
    <rect x="85" y="127" width="54" height="30" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="112" y="143" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">9</text>
    <rect x="139" y="127" width="54" height="30" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="166" y="143" text-anchor="middle" dominant-baseline="middle" font-size="14">7</text>
    <rect x="193" y="127" width="54" height="30" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="220" y="143" text-anchor="middle" dominant-baseline="middle" font-size="14">6</text>
    <rect x="247" y="127" width="54" height="30" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="274" y="143" text-anchor="middle" dominant-baseline="middle" font-size="14">4</text>
    <rect x="301" y="127" width="54" height="30" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="328" y="143" text-anchor="middle" dominant-baseline="middle" font-size="14">5</text>
    <text x="112" y="171" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">0</text>
    <text x="166" y="171" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">1</text>
    <text x="220" y="171" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">2</text>
    <text x="274" y="171" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">3</text>
    <text x="328" y="171" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">4</text>
  </svg>
  <figcaption>按层写入数组后，堆顶 9 位于下标 0。</figcaption>
</figure>

按层存入数组，使用从 0 开始的下标时，`i` 的左孩子是 `2*i+1`，右孩子是 `2*i+2`，非根节点的父亲是 `(i-1)/2`。孩子下标是否存在由数组长度决定。

## 2. 上浮、下沉和建堆

| 操作 | 变化 | 时间复杂度 |
| --- | --- | --- |
| 查看堆顶 | 直接读根 | $O(1)$ |
| 插入 | 加到末尾，再逐层上浮 | 堆调整 $O(\log n)$ |
| 弹出堆顶 | 用末尾填根，再逐层下沉 | $O(\log n)$ |
| 批量建堆 | 从最后一个有孩子的节点向前下沉 | $O(n)$ |

以大根堆为例，插入的新元素大于父亲时与父亲交换，直到满足堆序。弹出堆顶后，从两个孩子中选较大的一个比较和交换，否则换完也可能破坏与另一侧孩子的顺序。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 133" role="img" aria-label="大根堆删除堆顶时的替换和下沉" fill="currentColor">
    <text x="14" y="26" text-anchor="start" dominant-baseline="middle" font-size="13">原堆</text>
    <rect x="124" y="12" width="48" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="148" y="26.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">9</text>
    <rect x="172" y="12" width="48" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="196" y="26.5" text-anchor="middle" dominant-baseline="middle" font-size="14">7</text>
    <rect x="220" y="12" width="48" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="244" y="26.5" text-anchor="middle" dominant-baseline="middle" font-size="14">6</text>
    <rect x="268" y="12" width="48" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="292" y="26.5" text-anchor="middle" dominant-baseline="middle" font-size="14">4</text>
    <rect x="316" y="12" width="48" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="340" y="26.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">5</text>
    <text x="14" y="65" text-anchor="start" dominant-baseline="middle" font-size="13">末尾补到堆顶</text>
    <rect x="124" y="51" width="48" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="148" y="65.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">5</text>
    <rect x="172" y="51" width="48" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="196" y="65.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">7</text>
    <rect x="220" y="51" width="48" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="244" y="65.5" text-anchor="middle" dominant-baseline="middle" font-size="14">6</text>
    <rect x="268" y="51" width="48" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="292" y="65.5" text-anchor="middle" dominant-baseline="middle" font-size="14">4</text>
    <text x="14" y="104" text-anchor="start" dominant-baseline="middle" font-size="13">与较大孩子交换</text>
    <rect x="124" y="90" width="48" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="148" y="104.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">7</text>
    <rect x="172" y="90" width="48" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="196" y="104.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">5</text>
    <rect x="220" y="90" width="48" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="244" y="104.5" text-anchor="middle" dominant-baseline="middle" font-size="14">6</text>
    <rect x="268" y="90" width="48" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="292" y="104.5" text-anchor="middle" dominant-baseline="middle" font-size="14">4</text>
  </svg>
  <figcaption>移走 9 后，让末尾的 5 补到根，再与较大的孩子 7 交换。</figcaption>
</figure>

批量建堆时，大多数节点靠近底层。例如约一半为叶子，下沉 0 层。再往上一层的节点约占四分之一，最多下沉 1 层。按层相加得到 $O(n)$。逐个调用插入则通常只能给出 $O(n\log n)$ 的总复杂度上界。

## 3. C++ STL 容器和算法

- `priority_queue<int>` 默认是大根堆，头文件为 `<queue>`。
- `priority_queue<int, vector<int>, greater<int>>` 是小根堆。`greater` 的头文件为 `<functional>`。
- `top()` 和 `pop()` 要求堆非空。`pop()` 删除堆顶，值要事先读取。
- 接受迭代器范围的构造函数可批量建堆。如果需要直接使用数组，也能调用 `make_heap`、`push_heap`、`pop_heap`。`pop_heap` 只把原堆顶移到范围末尾，调用者再用 `pop_back` 真正删除元素。
- 优先队列不提供对任意元素的直接修改。Dijkstra 中较常见的做法是每次变短时把新距离入堆，弹出时检查条目里的距离是否等于当前最短距离。

## 4. 操作示例：维护前 k 大

堆中只保留前 `k` 大的候选。需要淘汰时删掉其中最小的值，所以最小候选应在堆顶。若新值不大于堆顶，至少已经有 `k` 个值不小于它，可以跳过。

```cpp
#include <algorithm>
#include <cstddef>
#include <functional>
#include <queue>
#include <vector>

std::vector<int> top_k_largest(const std::vector<int>& a, std::size_t k) {
    k = std::min(k, a.size());
    if (k == 0) return {};

    std::priority_queue<int, std::vector<int>, std::greater<int>> heap;
    for (int x : a) {
        if (heap.size() < k) {
            heap.push(x);
        } else if (x > heap.top()) {
            heap.pop();
            heap.push(x);
        }
    }

    std::vector<int> result(k);
    for (std::size_t i = k; i > 0; --i) {
        result[i - 1] = heap.top();
        heap.pop();
    }
    return result;
}
```

例如 `[5, 1, 8, 2, 8]` 取前 3 大，结果为 `[8, 8, 5]`，重复值各占一个名额。时间为 $O(n\log(k+1))$，额外空间为 $O(k)$。如果只求第 $k$ 大，处理完所有值后直接读堆顶即可。

## 5. 比较器和常见选型

`priority_queue` 的比较器为真表示左边排在右边之前，堆顶取这个顺序里的最后一端。默认是 `less`，所以最大元素优先。保存任务或状态时，可以用 `pair` 的字典序处理第一关键字相同的情况。若希望同优先级时按加入顺序处理，把加入序号作为第二关键字。

- **多路归并。** 堆中保存每个有序序列当前的首项。弹出最小项后，让同一序列的下一项入堆。若一共有 `k` 路、总长为 `m`，时间为 $O(m\log(k+1))$。
- **霍夫曼合并。** 反复取两个最小权值，合并后把新权值放回小根堆。
- **动态有序集合。** 若要找任意键、删除任意位置或求前驱后继，用有序容器更直接。二叉堆擅长不断取一个方向的最值。
