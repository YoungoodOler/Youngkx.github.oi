---
title: "学过C++的同学在学习Python"
date: "2026-09-04"
slug: "Cpp+fan+learns+Python"
tags:
  - cs
  - talk
# 可选：code / cs / ai / vlog / talk / web / network / timeline
card: cs
excerpt: "本篇是一个学过C++的同学在学习Python过程中对于Python的吐槽"
draft: false
---

本篇是一个学过C++的同学在学习Python过程中对于Python的~~吐槽~~，我会随时记录我在学习过程中遇到的问题，包括C++和Python在各方面的差异。

## 1. Python是一个弱数据类型编程语言

在C++中，我们定义变量时需要指定数据类型，比如`int a;`，而在Python中，我们不需要指定数据类型，比如`a = 1`，Python会自动判断`a`是整数类型。

> 吐槽：哇塞看起来真的好方便！！！但是对于一个学过C++的人来说，天知道直接写`a = 1`而不用在最前面`int`一下有多奇怪！！！没有`int`就像直接跳过了定义变量的步骤！！！

## 2.Python中的input()

在C++中，我们使用`cin`来获取用户输入，而在Python中，我们使用`input()`。

* 输入的数据类型

    在C++中，`cin`会直接按照你规定的数据类型输入变量，现在而在Python中，即使你`input()`输入了一个数，它返回的却是一个字符串。因此，我们通常需要使用`int()`函数将输入的字符串转换为整数。

    ```python
    # C++中的代码
    int num;
    cin >> num;

    # Python中的代码
    num = int(input())
    ```

* 输入的格式

    在C++中，`cin`会自动以输入中的空格和换行符为标志，直接批量输入数据。
    ```cpp
    int a, b, c;
    cin >> a >> b >> c;
    ```
    
    而在Python中，`input()`会直接返回字符串，包括空格和换行符。
    
    因此，如果我们直接用
    ```python
    input()
    input()
    ...
    ```
    那么在大批输入数据时，我们每次输入一个数字都要按回车。

    **如果我们想要像`cin`一样用空格隔开**

    比如输入三个数
    ```python
    1 2 3
    ```
    为了一次性得到三个数字，可以这样：
    ```python
    a,b,c = map(int,input().split())
    ```
    这里：

    + `input()`：读取整行字符串 "10 20 30"
    + `.split()`：按照空格切开得到一个字符串列表 → ["10", "20", "30"]
    + `map(int, ...)`：把字符串转成整数
    + `a, b, c =`：分别赋值

    如果数量不确定，可以这样：
    ```python
    a = list(map(int, input().split()))
    ```
    这时候就会全部返回一个列表，例如
    ```python
    #输入
    1 5 8 12 20 35
    
    #则print(a)后输出
    [1, 5, 8, 12, 20, 35]
    ```
