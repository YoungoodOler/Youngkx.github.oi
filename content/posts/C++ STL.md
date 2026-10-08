---
title: "C++ STL"
date: "2026-10-08"
slug: "cpp-stl"
tags:
  - C
# 可选：code / cs / ai / vlog / talk / web / network / timeline
card: code
excerpt: "讲解C++ STL"
draft: false
---

# C++ STL

STL 全称：
> Standard Template Library
> 标准模板库

简单说：
> STL 就是 C++ 官方已经帮你写好的一大堆“常用数据结构 + 常用算法 + 工具”。

这直接为我们省去了大量coding基础算法的时间，让我们把精力放在真正的问题上。

例如，如果我们想要对一串数据排序，我们通常要手敲一个冒泡排序或者别的什么排序，而有了STL之后，我们可以直接：
```cpp
sort();
```
甚至，`sort()`的时间复杂度都优于我们手敲的算法。

## 1. STL六大组件

- 容器（Container）
- 算法（Algorithm）
- 迭代器（Iterator）
- 仿函数（Function object）
- 适配器（Adaptor）
- 分配器（Allocator）

## 2. 容器

1. 序列容器：存储元素的序列，允许双向遍历。
    - vector：动态数组，支持快速随机访问。
    - deque：双端队列，支持快速插入和删除。
    - list：链表，支持快速插入和删除，但不支持随机访问。
2. 关联容器: 支持高效的查找、插入和删除操作，通常使用**平衡二叉树**实现。
    - set：集合，不允许重复元素。
    - multiset：多重集合，允许多个元素具有相同的键。
    - map：映射，每个键映射到一个值。
    - multimap：多重映射，存储了键值对（pair），其中键是唯一的，但值可以重复，允许一个键映射到多个值。
3. 无序容器（C++11 引入）：哈希表，支持快速的查找、插入和删除。
    - unordered_set：无序集合。
    - unordered_multiset：无序多重集合。
    - unordered_map：无序映射。
    - unordered_multimap：无序多重映射。

## 3. 算法

STL 提供了大量的算法，包括但不限于：
- 排序和搜索：`sort`, `binary_search`, `lower_bound`, `upper_bound` 等。
- 数值算法：`accumulate`, `inner_product`, `adjacent_difference` 等。
- 修改算法：`fill`, `transform`, `replace` 等。

## 4. 迭代器

迭代器是一种泛型指针，用于遍历容器中的元素。STL 提供了多种迭代器类型，包括：
- 输入迭代器：用于读取容器中的元素。
- 输出迭代器：用于向容器中写入元素。
- 前向迭代器：支持读取和写入操作，但不支持随机访问。
- 双向迭代器：支持读取和写入操作，支持双向遍历。
- 随机访问迭代器：支持读取和写入操作，支持随机访问。

其余组件对于初学者来说并不重要，因此不再赘述。
