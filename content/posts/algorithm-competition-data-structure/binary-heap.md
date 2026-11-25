---
title: "二叉堆（Binary Heap）"
excerpt: "二叉堆的完全二叉树结构、上浮下沉和 priority_queue 的基本操作。"
---

[← 返回数据结构总览](../)

## 1. 基本概念

二叉堆用一棵完全二叉树维护一组元素的最值。大根堆里父结点不小于孩子，根保存最大值；小根堆的规则相反，根保存最小值。

## 2. 结构与工作原理

### 2.1 用数组存完全二叉树

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

把结点按层从左到右放进数组。以 0 为起始下标，`i` 的左右孩子分别是 `2*i+1` 和 `2*i+2`；非根结点的父结点是 `(i-1)/2`。孩子下标超过数组末尾就表示不存在。

### 2.2 上浮、下沉和建堆

大根堆插入时，把新值放到末尾。若它比父结点大，就交换并继续向上。删除堆顶时，用末尾元素补到根，然后和两个孩子中更大的那个比较。不满足堆序时交换并继续向下。

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

初次建堆可以从最后一个非叶结点开始，从后向前下沉。约一半结点是叶子，其上也有大量只需下沉一层的结点。加总每层的工作量可得线性时间。

## 3. 基本操作及时间复杂度

| 操作 | 时间复杂度 |
| --- | --- |
| 读取堆顶 | $O(1)$ |
| 插入并恢复堆序 | 调整堆序 $O(\log n)$ |
| 删除堆顶并恢复堆序 | $O(\log n)$ |
| 自底向上批量建堆 | $O(n)$ |
| 查找任意指定值 | 最坏 $O(n)$ |

存 `n` 个元素用 $O(n)$ 空间。数组末尾追加还可能遇到扩容，表中的插入复杂度单指堆序调整。

<aside class="ds-note" aria-label="空堆与比较器">
  <p><strong>空堆与比较器。</strong>堆为零个元素时不能读取或弹出堆顶。声明小根堆时，将比较器设为 <code>greater&lt;int&gt;</code>。</p>
</aside>

## 4. C++ 代码实现

### 4.1 用小根堆保留前 k 大

让堆最多保存 `k` 个元素。此时堆顶是已有候选里最小的值。来了更大的数，就用它替换堆顶，尺寸保持不变。例中把弹出顺序反转，输出从大到小的前 3 个值，重复值分别计数。

```cpp
#include <algorithm>
#include <functional>
#include <iostream>
#include <queue>
#include <vector>
using namespace std;

int main() {
    int a[] = {5, 1, 8, 2, 8};
    int k = 3;
    priority_queue<int, vector<int>, greater<int>> q;

    for (int x : a) {
        q.push(x);
        if (int(q.size()) > k) q.pop();
    }

    vector<int> ans;
    while (!q.empty()) {
        ans.push_back(q.top());
        q.pop();
    }
    reverse(ans.begin(), ans.end());
    for (int x : ans) cout << x << ' ';
    cout << '\n';
}
```

运行结果

```text
8 8 5
```

复杂度为 $O(n\log(k+1))$，堆的额外空间为 $O(k)$。

## 5. STL 中的对应容器

`priority_queue` 在 `<queue>` 中，默认大根堆。小根堆用 `greater<int>`。批量建堆还可直接用 `<algorithm>` 中的 `make_heap`。

| 接口 | 作用 |
| --- | --- |
| `push(x)` | 加入元素 |
| `top()` | 查堆顶 |
| `pop()` | 删除堆顶 |
| `empty()`、`size()` | 判空、取长度 |

```cpp
#include <functional>
#include <iostream>
#include <queue>
#include <vector>
using namespace std;

int main() {
    priority_queue<int> big;
    priority_queue<int, vector<int>, greater<int>> small;
    int a[] = {9, 7, 6, 4};
    for (int x : a) {
        big.push(x);
        small.push(x);
    }

    cout << big.top() << ' ' << small.top() << '\n';
    big.pop();
    cout << big.top() << '\n';
}
```

运行结果

```text
9 4
7
```

## 6. 典型应用场景

### 6.1 典型用法

- Dijkstra 取出当前距离最小的候选。若一个点多次入堆，可在取出时跳过过期距离。
- 多路归并。小根堆保存每路当前的首项，弹出哪一路就补入该路的下一项。
- 霍夫曼合并。循环取出两个最小权值，将它们的和放回堆。

### 6.2 洛谷例题

| 题目 | 练习点 |
| --- | --- |
| [洛谷 P3378 堆](https://www.luogu.com.cn/problem/P3378) | 实现小根堆的插入、取最小、删最小 |

## 7. 优点与局限性

堆适合反复取一个方向的最值，数组实现空间连续。堆序只要求父子之间满足关系，无法从堆数组里直接读出全局排序。需要随意删除指定键或查询前驱时，可使用有序容器。
