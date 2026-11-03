---
title: "C++ 数组排序：sort()入门教程"
date: "2026-11-02"
slug: "cpp-sort-tutorial"
tags:
  - C / C++
  - OI
# 可选：code / cs / ai / vlog / talk / web / network / timeline
card: code
excerpt: "本教程讲解传统数组的STL快速排序。"
draft: false
---

# C++ 数组排序：sort 入门教程

本教程只讲传统数组的排序。学会后，你就能把一组数字从小到大或从大到小排列。

## 一、需要的头文件

```cpp
#include <iostream>
#include <algorithm>
using namespace std;
```

- `iostream`：用于输入和输出。
- `algorithm`：提供排序函数 `sort`。
- 写了 `using namespace std;` 后，可以直接使用 `cin`、`cout` 和 `sort`。

## 二、从小到大排序

### 1. 基本写法

```cpp
sort(数组名, 数组名 + 元素个数);
```

例如，数组 `a` 中有 5 个数：

```cpp
sort(a, a + 5);
```

这会把数组中的 5 个数从小到大排列，也叫**升序排序**。

### 2. 完整例子

```cpp
#include <iostream>
#include <algorithm>
using namespace std;

int main() {
    int a[5] = {5, 2, 4, 1, 3};

    sort(a, a + 5);

    for (int i = 0; i < 5; i++) cout << a[i] << " ";

    return 0;
}
```

输出：

```text
1 2 3 4 5
```

排序会直接改变原数组。执行后，`a[0]` 是 `1`，`a[1]` 是 `2`，依此类推。

## 三、从大到小排序

只使用这两个头文件时，可以先升序排序，再用 `reverse` 把数组顺序反过来。

```cpp
sort(a, a + 5);
reverse(a, a + 5);
```

`reverse` 也由 `algorithm` 提供。注意：它只负责反转顺序，因此要先排序，再反转。

### 完整例子

```cpp
#include <iostream>
#include <algorithm>
using namespace std;

int main() {
    int a[5] = {5, 2, 4, 1, 3};

    sort(a, a + 5);
    reverse(a, a + 5);

    for (int i = 0; i < 5; i++) cout << a[i] << " ";

    return 0;
}
```

输出：

```text
5 4 3 2 1
```

### 更简便的降序写法

如果允许多加一个头文件 `functional`，可以直接用 `greater<int>()` 降序排序，不需要再反转数组：

```cpp
sort(a, a + n, greater<int>());
```

这里的 `int` 对应数组元素的类型。

完整例子：

```cpp
#include <iostream>
#include <algorithm>
#include <functional>
using namespace std;

int main() {
    int a[5] = {5, 2, 4, 1, 3};

    sort(a, a + 5, greater<int>());

    for (int i = 0; i < 5; i++) cout << a[i] << " ";

    return 0;
}
```

输出：

```text
5 4 3 2 1
```

**注意：使用 `greater<int>()` 时，应包含 `<functional>`，以保证不同编译器下都能正确使用。** 如果只用 `iostream` 和 `algorithm`，就使用前面先排序、再反转的写法。

## 四、只排序数组的一部分

数组的下标从 `0` 开始：

| 元素 | 第 1 个 | 第 2 个 | 第 3 个 | 第 4 个 | 第 5 个 |
| --- | --- | --- | --- | --- | --- |
| 下标 | 0 | 1 | 2 | 3 | 4 |

如果只想排序下标 `1` 到 `3` 的元素，可以写：

```cpp
sort(a + 1, a + 4);
```

**开始位置包含在内，结束位置不包含在内。** 所以结束位置要写到下标 `4`，实际排序的是下标 `1、2、3`。

例如：

```cpp
int a[5] = {9, 4, 2, 3, 8};
sort(a + 1, a + 4);
// 排序后：9 2 3 4 8
```

两端的 `9` 和 `8` 不参与排序。

## 五、输入 n 个数，再排序输出

下面的程序先输入元素个数 `n`，再输入这 `n` 个整数，最后按从小到大的顺序输出。

### 完整程序

```cpp
#include <iostream>
#include <algorithm>
using namespace std;

int main() {
    int n;
    int a[100]; // 数组容量为 100，根据实际情况写容量

    cin >> n;

    for (int i = 0; i < n; i++) cin >> a[i];

    sort(a, a + n);

    for (int i = 0; i < n; i++) cout << a[i] << " ";

    return 0;
}
```

输入：

```text
5
8 3 6 1 4
```

输出：

```text
1 3 4 6 8
```

这里数组的容量是 `100`，但实际输入了 `n` 个数，所以应写 `sort(a, a + n)`，只排序已经输入的部分。

## 六、初学者容易写错的地方

### 1. 结束位置少写了 1

```cpp
sort(a, a + 5);  // 排序前 5 个元素：下标 0 到 4
sort(a, a + 4);  // 只排序前 4 个元素：下标 0 到 3
```

记住：**排序前 n 个数，就写 `sort(a, a + n)`。**

### 2. 把数组元素当成排序位置

```cpp
sort(a, a + 5);  // 正确
// sort(a[0], a[4]);  // 错误
```

先记住正确写法即可：这里需要写数组中的位置，不能直接传入两个整数元素。

### 3. 排序范围超过数组大小

如果数组只有 5 个元素，就不能写 `sort(a, a + 6)`。排序范围必须在数组的有效范围内。

### 4. 以为排序会删除重复数字

排序只改变顺序，不会删除数字。例如：

```text
排序前：3 1 3 2 1
排序后：1 1 2 3 3
```

## 七、常用写法速查

```cpp
// 1. 前 n 个数从小到大排列。
sort(a, a + n);

// 2. 前 n 个数从大到小排列：先排序，再反转。
sort(a, a + n);
reverse(a, a + n);

// 3. 只排序下标 1 到 3 的元素。
sort(a + 1, a + 4);
```

允许额外包含 `<functional>` 时，降序还可以直接写：

```cpp
sort(a, a + n, greater<int>());
```
