---
title: "栈（Stack）"
excerpt: "栈的后进先出、STL 操作，以及括号匹配和单调栈的用途。"
---

[← 返回数据结构总览](../)

## 1. 基本概念

栈（Stack）把所有插入和删除操作限制在同一端，这一端叫**栈顶**。最后放入的元素最先取出，称为后进先出（LIFO）。另一端叫栈底。

## 2. 结构与工作原理

### 2.1 入栈与出栈

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 131" role="img" aria-label="栈顶压入和弹出" fill="currentColor">
    <rect x="149" y="19" width="142" height="28" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="220" y="34" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">C</text>
    <rect x="149" y="52" width="142" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="220" y="67" text-anchor="middle" dominant-baseline="middle" font-size="14">B</text>
    <rect x="149" y="85" width="142" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="220" y="100" text-anchor="middle" dominant-baseline="middle" font-size="14">A</text>
    <path d="M70 33 L145 33" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M139.0 29.0 L145 33 L139.0 37.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M295 33 L370 33" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M364.0 29.0 L370 33 L364.0 37.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <text x="104" y="17" text-anchor="middle" dominant-baseline="middle" font-size="13">压入</text>
    <text x="335" y="17" text-anchor="middle" dominant-baseline="middle" font-size="13">弹出</text>
    <text x="220" y="123" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">栈底</text>
  </svg>
  <figcaption>C 最后压入，下一次弹出会先取走 C。</figcaption>
</figure>

依次压入 A、B、C，栈从底到顶为 A、B、C。读取栈顶可以看到 C，出栈才真正把它移除。继续弹出时，次序是 B、A。

### 2.2 栈为什么能处理嵌套？

遇到左括号就入栈，遇到右括号就和栈顶配对。以 `([()])` 为例，最里面的 `()` 必须先闭合，然后处理 `[]`，最后处理最外面的 `()`。若右括号到来时栈为空、类型不符，或扫描结束时还有左括号留在栈里，都无法完成匹配。

### 2.3 单调栈怎样维护候选？

单调栈存的是尚未找到答案的位置。求每个位置右侧第一个严格更大的元素时，从左向右扫描，栈中对应的值保持非递增。一旦新值大于栈顶，它就给栈顶位置提供了答案。再继续检查下一个栈顶。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 142" role="img" aria-label="下一个严格更大元素对应的位置" fill="currentColor">
    <path d="M91 84 C103 8, 301 8, 313 84" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-width="1.7"/>
    <path d="M166 84 C178 43, 222 43, 234 84" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-width="1.7"/>
    <path d="M241 84 C253 48, 298 48, 310 84" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-width="1.7"/>
    <rect x="66" y="85" width="50" height="30" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="91" y="101" text-anchor="middle" dominant-baseline="middle" font-size="14">2</text>
    <rect x="141" y="85" width="50" height="30" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="166" y="101" text-anchor="middle" dominant-baseline="middle" font-size="14">1</text>
    <rect x="216" y="85" width="50" height="30" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="241" y="101" text-anchor="middle" dominant-baseline="middle" font-size="14">2</text>
    <rect x="291" y="85" width="50" height="30" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="316" y="101" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">4</text>
    <text x="91" y="130" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">i=0</text>
    <text x="166" y="130" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">i=1</text>
    <text x="241" y="130" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">i=2</text>
    <text x="316" y="130" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">i=3</text>
  </svg>
  <figcaption>下标 1 被下标 2 的元素解决。下标 0 和 2 都等到下标 3 才找到严格更大的元素。</figcaption>
</figure>

相同值都可能在等待一个更大的值，所以此处只在严格小于当前值时弹出。

## 3. 基本操作及时间复杂度

| 操作 | 作用 | 时间复杂度 |
| --- | --- | --- |
| 压入、弹出 | 增删栈顶元素 | $O(1)$ |
| 查看栈顶 | 保留元素 | $O(1)$ |
| 判空、取长度 | 检查栈状态 | $O(1)$ |
| 搜索中间元素 | 复制栈后逐项弹出 | 最坏 $O(n)$ |

表中采用 `stack` 默认底层容器。存 `n` 个元素需要 $O(n)$ 空间。单调栈虽然在某一步可能连续弹出多个元素，每个下标总共只入栈和出栈各一次，整轮扫描仍为 $O(n)$。

<aside class="ds-note" aria-label="空栈">
  <p><strong>空栈。</strong>调用 <code>top()</code> 或 <code>pop()</code> 前先确认非空。<code>pop()</code> 不会返回刚移除的值。</p>
</aside>

## 4. C++ 代码实现

下面用 `stack<int>` 存下标，求右侧第一个**严格更大**的下标。示例使用 0 起始下标，`-1` 表示没有答案。相等时先把当前位置也保留下来。

```cpp
#include <iostream>
#include <stack>
#include <vector>
using namespace std;

int main() {
    vector<int> a = {2, 1, 2, 4};
    vector<int> ans(a.size(), -1);
    stack<int> s;

    for (int i = 0; i < int(a.size()); ++i) {
        while (!s.empty() && a[s.top()] < a[i]) {
            ans[s.top()] = i;
            s.pop();
        }
        s.push(i);
    }

    for (int x : ans) cout << x << ' ';
    cout << '\n';
}
```

运行结果

```text
3 2 3 -1
```

## 5. STL 中的对应容器

| `stack<T>` 接口 | 作用 |
| --- | --- |
| `push(x)`、`emplace(...)` | 压入元素 |
| `top()` | 读栈顶 |
| `pop()` | 删除栈顶 |
| `empty()`、`size()` | 判空、查询元素数 |

头文件是 `<stack>`。`pop()` 没有返回值，需要时先复制 `top()`。使用 `top()` 和 `pop()` 前要确保栈非空。

```cpp
#include <iostream>
#include <stack>
using namespace std;

int main() {
    stack<int> s;
    s.push(10);
    s.push(20);

    cout << s.top() << '\n';
    s.pop();
    cout << s.top() << '\n';
}
```

运行结果

```text
20
10
```

## 6. 典型应用场景

### 6.1 典型用法

- 括号、表达式和撤销操作。较晚保存的记录优先处理。
- 用显式栈模拟 DFS。需要在退出结点时处理信息，可分别保存进入和退出这两个状态。
- 单调栈求最近更大、更小元素，或求柱状图中某根柱子能向两侧延伸的范围。

### 6.2 洛谷例题

| 题目 | 练习点 |
| --- | --- |
| [洛谷 P5788 单调栈](https://www.luogu.com.cn/problem/P5788) | 用单调栈维护等待答案的下标，按题意转换下标和无解值 |

## 7. 优点与局限性

栈特别适合嵌套或回退过程，接口少，边界清楚。若还需要访问整条已保存的路径，直接把 `vector` 当栈使用更灵活。若处理顺序是先进先出，应选队列。单调栈中要先判断题目是否允许相等，再选择弹出条件。
