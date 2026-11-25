---
title: "栈（Stack）"
excerpt: "讲解后进先出、括号匹配与单调栈，并推导下一个更大元素的写法。"
---

[← 返回数据结构总览](../)

## 1. 后进先出什么时候有用？

栈只有一个出入口。若还没处理完 A，就开始处理 B，那么通常得先完成 B，再回到 A。函数调用和嵌套括号都是这种顺序。

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

以 `([()])` 为例，读到左括号就压栈。读到右括号，要检查它能否和当前栈顶配对，再将栈顶弹出。若栈为空、括号类型不同，或读完整个串时栈还有元素，配对失败。

## 2. 基本操作与 STL

| 操作 | `std::stack` 接口 | 默认底层容器下的时间复杂度 |
| --- | --- | --- |
| 压入 | `push(x)` | $O(1)$ |
| 查看栈顶 | `top()` | $O(1)$ |
| 弹出 | `pop()` | $O(1)$ |
| 判空 | `empty()` | $O(1)$ |

头文件为 `<stack>`。`pop()` 不返回栈顶值，取值要先调用 `top()`。两者都要求栈非空。若需要读出所有已存元素，例如在 DFS 中保留整条路径，可以把 `vector` 当栈，用 `back()`、`push_back()`、`pop_back()`。

## 3. 单调栈怎样减少比较？

求数组里每个元素右侧**第一个严格大于它**的元素。扫描到下标 `i` 时，栈里存的是还没找到答案的下标。若 `a[i]` 大于栈顶值，`i` 就是栈顶的答案，继续弹出所有能被它解决的下标。栈内对应的值从底到顶保持非递增。

| 扫描 `[2, 1, 2, 4]` | 这一步得到的答案 | 扫描后栈内下标 |
| --- | --- | --- |
| `i = 0`，值为 2 | 无 | `[0]` |
| `i = 1`，值为 1 | 无 | `[0, 1]` |
| `i = 2`，值为 2 | `ans[1] = 2` | `[0, 2]` |
| `i = 3`，值为 4 | `ans[2] = ans[0] = 3` | `[3]` |

两个值同为 2 时不能互相作答，所以比较用严格大于。栈中保存下标，可以区分相同值的不同位置，也能直接计算距离。

## 4. C++ 实现和应用

```cpp
#include <stack>
#include <vector>

std::vector<int> next_greater_index(const std::vector<int>& a) {
    int n = static_cast<int>(a.size());
    std::vector<int> ans(n, -1);
    std::stack<int> pending;

    for (int i = 0; i < n; ++i) {
        while (!pending.empty() && a[pending.top()] < a[i]) {
            ans[pending.top()] = i;
            pending.pop();
        }
        pending.push(i);
    }
    return ans;
}
```

新下标只会被压入一次、弹出至多一次，整个循环共 $O(n)$，额外空间为 $O(n)$。把「严格更大」改为「严格更小」时，反转比较方向。柱状图最大矩形也使用单调栈，两侧第一个更矮的位置用来确定每根柱子的可延伸宽度。

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

## 5. 单调性和栈中内容怎么定？

| 想找的位置 | 扫描顺序 | 当前值触发弹出的条件 |
| --- | --- | --- |
| 右侧第一个严格更大 | 从左到右 | 栈顶值 `<` 当前值 |
| 右侧第一个严格更小 | 从左到右 | 栈顶值 `>` 当前值 |
| 左侧第一个严格更大 | 从右到左 | 栈顶值 `<` 当前值 |
| 左侧第一个严格更小 | 从右到左 | 栈顶值 `>` 当前值 |

表格使用「给等待中的位置找答案」的写法，当前下标是所有被弹出位置的答案。若题意允许相等，把比较符号改为非严格即可。保存下标还能让柱状图题在栈顶弹出时计算宽度。

<aside class="ds-note" aria-label="变式使用条件">
  <p><strong>栈和单调栈。</strong>撤销操作时必须保留全部操作记录。单调栈可以弹掉已找到答案或失去价值的候选位置，每个位置是否能弹掉由题意决定。</p>
</aside>
