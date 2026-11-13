// Fixed, verified campaign v1. Reproduce with npm run campaign:generate.
export default [
  {
    "game": "mines",
    "number": 1,
    "title": "初见 · 1",
    "objective": "从左上角安全格出发，推理找出 3 颗雷，翻开全部安全格。",
    "size": 4,
    "mines": [
      7,
      9,
      11
    ],
    "mineCount": 3,
    "counts": [
      0,
      0,
      1,
      1,
      1,
      1,
      3,
      -1,
      1,
      -1,
      3,
      -1,
      1,
      1,
      2,
      1
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "reveal",
        "cell": 10
      },
      {
        "kind": "flag",
        "cell": 9
      },
      {
        "kind": "flag",
        "cell": 11
      },
      {
        "kind": "reveal",
        "cell": 8
      },
      {
        "kind": "reveal",
        "cell": 12
      },
      {
        "kind": "reveal",
        "cell": 13
      },
      {
        "kind": "reveal",
        "cell": 14
      },
      {
        "kind": "reveal",
        "cell": 15
      },
      {
        "kind": "flag",
        "cell": 7
      },
      {
        "kind": "reveal",
        "cell": 3
      }
    ],
    "subsetDeductions": 2
  },
  {
    "game": "mines",
    "number": 2,
    "title": "初见 · 2",
    "objective": "从左上角安全格出发，推理找出 3 颗雷，翻开全部安全格。",
    "size": 4,
    "mines": [
      2,
      10,
      12
    ],
    "mineCount": 3,
    "counts": [
      0,
      1,
      -1,
      1,
      0,
      2,
      2,
      2,
      1,
      2,
      -1,
      1,
      -1,
      2,
      1,
      1
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "flag",
        "cell": 10
      },
      {
        "kind": "reveal",
        "cell": 6
      },
      {
        "kind": "reveal",
        "cell": 14
      },
      {
        "kind": "flag",
        "cell": 2
      },
      {
        "kind": "reveal",
        "cell": 11
      },
      {
        "kind": "reveal",
        "cell": 13
      },
      {
        "kind": "reveal",
        "cell": 15
      },
      {
        "kind": "flag",
        "cell": 12
      },
      {
        "kind": "reveal",
        "cell": 3
      },
      {
        "kind": "reveal",
        "cell": 7
      }
    ],
    "subsetDeductions": 2
  },
  {
    "game": "mines",
    "number": 3,
    "title": "初见 · 3",
    "objective": "从左上角安全格出发，推理找出 3 颗雷，翻开全部安全格。",
    "size": 4,
    "mines": [
      8,
      10,
      11
    ],
    "mineCount": 3,
    "counts": [
      0,
      0,
      0,
      0,
      1,
      2,
      2,
      2,
      -1,
      2,
      -1,
      -1,
      1,
      2,
      2,
      2
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "flag",
        "cell": 10
      },
      {
        "kind": "flag",
        "cell": 11
      },
      {
        "kind": "reveal",
        "cell": 9
      },
      {
        "kind": "flag",
        "cell": 8
      },
      {
        "kind": "reveal",
        "cell": 12
      },
      {
        "kind": "reveal",
        "cell": 13
      },
      {
        "kind": "reveal",
        "cell": 14
      },
      {
        "kind": "reveal",
        "cell": 15
      }
    ],
    "subsetDeductions": 0
  },
  {
    "game": "mines",
    "number": 4,
    "title": "初见 · 4",
    "objective": "从左上角安全格出发，推理找出 3 颗雷，翻开全部安全格。",
    "size": 4,
    "mines": [
      3,
      12,
      13
    ],
    "mineCount": 3,
    "counts": [
      0,
      0,
      1,
      -1,
      0,
      0,
      1,
      1,
      2,
      2,
      1,
      0,
      -1,
      -1,
      1,
      0
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "flag",
        "cell": 12
      },
      {
        "kind": "flag",
        "cell": 13
      },
      {
        "kind": "reveal",
        "cell": 14
      },
      {
        "kind": "reveal",
        "cell": 7
      },
      {
        "kind": "reveal",
        "cell": 11
      }
    ],
    "subsetDeductions": 0
  },
  {
    "game": "mines",
    "number": 5,
    "title": "初见 · 5",
    "objective": "从左上角安全格出发，推理找出 3 颗雷，翻开全部安全格。",
    "size": 4,
    "mines": [
      10,
      11,
      15
    ],
    "mineCount": 3,
    "counts": [
      0,
      0,
      0,
      0,
      0,
      1,
      2,
      2,
      0,
      1,
      -1,
      -1,
      0,
      1,
      3,
      -1
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "flag",
        "cell": 10
      },
      {
        "kind": "flag",
        "cell": 11
      },
      {
        "kind": "reveal",
        "cell": 14
      }
    ],
    "subsetDeductions": 0
  },
  {
    "game": "mines",
    "number": 6,
    "title": "熟练 · 1",
    "objective": "从左上角安全格出发，推理找出 5 颗雷，翻开全部安全格。",
    "size": 5,
    "mines": [
      4,
      8,
      9,
      16,
      18
    ],
    "mineCount": 5,
    "counts": [
      0,
      0,
      1,
      3,
      -1,
      0,
      0,
      1,
      -1,
      -1,
      1,
      1,
      3,
      3,
      3,
      1,
      -1,
      2,
      -1,
      1,
      1,
      1,
      2,
      1,
      1
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "reveal",
        "cell": 13
      },
      {
        "kind": "reveal",
        "cell": 17
      },
      {
        "kind": "flag",
        "cell": 8
      },
      {
        "kind": "flag",
        "cell": 16
      },
      {
        "kind": "flag",
        "cell": 18
      },
      {
        "kind": "reveal",
        "cell": 3
      },
      {
        "kind": "reveal",
        "cell": 15
      },
      {
        "kind": "reveal",
        "cell": 21
      },
      {
        "kind": "reveal",
        "cell": 22
      },
      {
        "kind": "reveal",
        "cell": 23
      },
      {
        "kind": "flag",
        "cell": 4
      },
      {
        "kind": "flag",
        "cell": 9
      },
      {
        "kind": "reveal",
        "cell": 20
      },
      {
        "kind": "reveal",
        "cell": 19
      },
      {
        "kind": "reveal",
        "cell": 24
      },
      {
        "kind": "reveal",
        "cell": 14
      }
    ],
    "subsetDeductions": 2
  },
  {
    "game": "mines",
    "number": 7,
    "title": "熟练 · 2",
    "objective": "从左上角安全格出发，推理找出 5 颗雷，翻开全部安全格。",
    "size": 5,
    "mines": [
      12,
      13,
      15,
      19,
      24
    ],
    "mineCount": 5,
    "counts": [
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      2,
      2,
      1,
      1,
      2,
      -1,
      -1,
      2,
      -1,
      2,
      2,
      4,
      -1,
      1,
      1,
      0,
      2,
      -1
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "flag",
        "cell": 12
      },
      {
        "kind": "flag",
        "cell": 13
      },
      {
        "kind": "reveal",
        "cell": 14
      },
      {
        "kind": "reveal",
        "cell": 17
      },
      {
        "kind": "reveal",
        "cell": 16
      },
      {
        "kind": "reveal",
        "cell": 18
      },
      {
        "kind": "reveal",
        "cell": 21
      },
      {
        "kind": "reveal",
        "cell": 22
      },
      {
        "kind": "flag",
        "cell": 15
      },
      {
        "kind": "flag",
        "cell": 19
      },
      {
        "kind": "flag",
        "cell": 24
      },
      {
        "kind": "reveal",
        "cell": 20
      }
    ],
    "subsetDeductions": 1
  },
  {
    "game": "mines",
    "number": 8,
    "title": "熟练 · 3",
    "objective": "从左上角安全格出发，推理找出 5 颗雷，翻开全部安全格。",
    "size": 5,
    "mines": [
      3,
      7,
      12,
      14,
      20
    ],
    "mineCount": 5,
    "counts": [
      0,
      1,
      2,
      -1,
      1,
      0,
      2,
      -1,
      4,
      2,
      0,
      2,
      -1,
      3,
      -1,
      1,
      2,
      1,
      2,
      1,
      -1,
      1,
      0,
      0,
      0
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "flag",
        "cell": 12
      },
      {
        "kind": "reveal",
        "cell": 17
      },
      {
        "kind": "reveal",
        "cell": 22
      },
      {
        "kind": "flag",
        "cell": 7
      },
      {
        "kind": "flag",
        "cell": 20
      },
      {
        "kind": "reveal",
        "cell": 13
      },
      {
        "kind": "reveal",
        "cell": 2
      },
      {
        "kind": "flag",
        "cell": 14
      },
      {
        "kind": "reveal",
        "cell": 8
      },
      {
        "kind": "reveal",
        "cell": 9
      },
      {
        "kind": "flag",
        "cell": 3
      },
      {
        "kind": "reveal",
        "cell": 4
      }
    ],
    "subsetDeductions": 2
  },
  {
    "game": "mines",
    "number": 9,
    "title": "熟练 · 4",
    "objective": "从左上角安全格出发，推理找出 5 颗雷，翻开全部安全格。",
    "size": 5,
    "mines": [
      2,
      15,
      22,
      23,
      24
    ],
    "mineCount": 5,
    "counts": [
      0,
      1,
      -1,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      1,
      1,
      0,
      0,
      0,
      -1,
      2,
      2,
      3,
      2,
      1,
      2,
      -1,
      -1,
      -1
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "reveal",
        "cell": 12
      },
      {
        "kind": "flag",
        "cell": 2
      },
      {
        "kind": "flag",
        "cell": 15
      },
      {
        "kind": "flag",
        "cell": 22
      },
      {
        "kind": "flag",
        "cell": 23
      },
      {
        "kind": "flag",
        "cell": 24
      },
      {
        "kind": "reveal",
        "cell": 20
      },
      {
        "kind": "reveal",
        "cell": 21
      }
    ],
    "subsetDeductions": 1
  },
  {
    "game": "mines",
    "number": 10,
    "title": "熟练 · 5",
    "objective": "从左上角安全格出发，推理找出 5 颗雷，翻开全部安全格。",
    "size": 5,
    "mines": [
      4,
      10,
      15,
      23,
      24
    ],
    "mineCount": 5,
    "counts": [
      0,
      0,
      0,
      1,
      -1,
      1,
      1,
      0,
      1,
      1,
      -1,
      2,
      0,
      0,
      0,
      -1,
      2,
      1,
      2,
      2,
      1,
      1,
      1,
      -1,
      -1
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "flag",
        "cell": 10
      },
      {
        "kind": "flag",
        "cell": 4
      },
      {
        "kind": "flag",
        "cell": 15
      },
      {
        "kind": "flag",
        "cell": 23
      },
      {
        "kind": "flag",
        "cell": 24
      },
      {
        "kind": "reveal",
        "cell": 20
      },
      {
        "kind": "reveal",
        "cell": 21
      },
      {
        "kind": "reveal",
        "cell": 22
      }
    ],
    "subsetDeductions": 0
  },
  {
    "game": "mines",
    "number": 11,
    "title": "进阶 · 1",
    "objective": "从左上角安全格出发，推理找出 7 颗雷，翻开全部安全格。",
    "size": 6,
    "mines": [
      14,
      17,
      22,
      26,
      28,
      29,
      31
    ],
    "mineCount": 7,
    "counts": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      -1,
      2,
      2,
      -1,
      0,
      2,
      2,
      4,
      -1,
      4,
      1,
      2,
      -1,
      3,
      -1,
      -1,
      1,
      -1,
      2,
      2,
      2,
      2
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "flag",
        "cell": 14
      },
      {
        "kind": "reveal",
        "cell": 15
      },
      {
        "kind": "reveal",
        "cell": 20
      },
      {
        "kind": "reveal",
        "cell": 16
      },
      {
        "kind": "flag",
        "cell": 26
      },
      {
        "kind": "flag",
        "cell": 17
      },
      {
        "kind": "reveal",
        "cell": 21
      },
      {
        "kind": "reveal",
        "cell": 27
      },
      {
        "kind": "flag",
        "cell": 22
      },
      {
        "kind": "flag",
        "cell": 28
      },
      {
        "kind": "reveal",
        "cell": 23
      },
      {
        "kind": "reveal",
        "cell": 32
      },
      {
        "kind": "reveal",
        "cell": 33
      },
      {
        "kind": "reveal",
        "cell": 34
      },
      {
        "kind": "flag",
        "cell": 29
      },
      {
        "kind": "flag",
        "cell": 31
      },
      {
        "kind": "reveal",
        "cell": 30
      },
      {
        "kind": "reveal",
        "cell": 35
      }
    ],
    "subsetDeductions": 0
  },
  {
    "game": "mines",
    "number": 12,
    "title": "进阶 · 2",
    "objective": "从左上角安全格出发，推理找出 7 颗雷，翻开全部安全格。",
    "size": 6,
    "mines": [
      12,
      15,
      18,
      25,
      26,
      27,
      35
    ],
    "mineCount": 7,
    "counts": [
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      -1,
      2,
      1,
      -1,
      1,
      0,
      -1,
      4,
      4,
      3,
      2,
      0,
      2,
      -1,
      -1,
      -1,
      2,
      1,
      1,
      2,
      3,
      2,
      2,
      -1
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "flag",
        "cell": 15
      },
      {
        "kind": "reveal",
        "cell": 13
      },
      {
        "kind": "reveal",
        "cell": 14
      },
      {
        "kind": "reveal",
        "cell": 21
      },
      {
        "kind": "flag",
        "cell": 12
      },
      {
        "kind": "flag",
        "cell": 27
      },
      {
        "kind": "reveal",
        "cell": 19
      },
      {
        "kind": "reveal",
        "cell": 20
      },
      {
        "kind": "flag",
        "cell": 18
      },
      {
        "kind": "flag",
        "cell": 26
      },
      {
        "kind": "flag",
        "cell": 25
      },
      {
        "kind": "reveal",
        "cell": 24
      },
      {
        "kind": "reveal",
        "cell": 30
      },
      {
        "kind": "reveal",
        "cell": 31
      },
      {
        "kind": "reveal",
        "cell": 32
      },
      {
        "kind": "reveal",
        "cell": 33
      },
      {
        "kind": "reveal",
        "cell": 34
      }
    ],
    "subsetDeductions": 0
  },
  {
    "game": "mines",
    "number": 13,
    "title": "进阶 · 3",
    "objective": "从左上角安全格出发，推理找出 7 颗雷，翻开全部安全格。",
    "size": 6,
    "mines": [
      4,
      10,
      12,
      16,
      22,
      30,
      31
    ],
    "mineCount": 7,
    "counts": [
      0,
      0,
      0,
      2,
      -1,
      2,
      1,
      1,
      0,
      3,
      -1,
      3,
      -1,
      1,
      0,
      3,
      -1,
      3,
      1,
      1,
      0,
      2,
      -1,
      2,
      2,
      2,
      1,
      1,
      1,
      1,
      -1,
      -1,
      1,
      0,
      0,
      0
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "flag",
        "cell": 12
      },
      {
        "kind": "flag",
        "cell": 4
      },
      {
        "kind": "flag",
        "cell": 10
      },
      {
        "kind": "flag",
        "cell": 16
      },
      {
        "kind": "flag",
        "cell": 22
      },
      {
        "kind": "reveal",
        "cell": 18
      },
      {
        "kind": "reveal",
        "cell": 24
      },
      {
        "kind": "reveal",
        "cell": 28
      },
      {
        "kind": "reveal",
        "cell": 32
      },
      {
        "kind": "reveal",
        "cell": 33
      },
      {
        "kind": "flag",
        "cell": 30
      },
      {
        "kind": "flag",
        "cell": 31
      },
      {
        "kind": "reveal",
        "cell": 23
      },
      {
        "kind": "reveal",
        "cell": 17
      },
      {
        "kind": "reveal",
        "cell": 11
      },
      {
        "kind": "reveal",
        "cell": 5
      }
    ],
    "subsetDeductions": 0
  },
  {
    "game": "mines",
    "number": 14,
    "title": "进阶 · 4",
    "objective": "从左上角安全格出发，推理找出 7 颗雷，翻开全部安全格。",
    "size": 6,
    "mines": [
      3,
      8,
      11,
      17,
      20,
      21,
      22
    ],
    "mineCount": 7,
    "counts": [
      0,
      1,
      2,
      -1,
      2,
      1,
      0,
      1,
      -1,
      2,
      3,
      -1,
      0,
      2,
      3,
      4,
      4,
      -1,
      0,
      1,
      -1,
      -1,
      -1,
      2,
      0,
      1,
      2,
      3,
      2,
      1,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "flag",
        "cell": 20
      },
      {
        "kind": "flag",
        "cell": 21
      },
      {
        "kind": "flag",
        "cell": 22
      },
      {
        "kind": "reveal",
        "cell": 14
      },
      {
        "kind": "reveal",
        "cell": 23
      },
      {
        "kind": "flag",
        "cell": 8
      },
      {
        "kind": "reveal",
        "cell": 2
      },
      {
        "kind": "reveal",
        "cell": 9
      },
      {
        "kind": "reveal",
        "cell": 15
      },
      {
        "kind": "flag",
        "cell": 3
      },
      {
        "kind": "reveal",
        "cell": 10
      },
      {
        "kind": "reveal",
        "cell": 16
      },
      {
        "kind": "flag",
        "cell": 17
      },
      {
        "kind": "reveal",
        "cell": 4
      },
      {
        "kind": "flag",
        "cell": 11
      },
      {
        "kind": "reveal",
        "cell": 5
      }
    ],
    "subsetDeductions": 0
  },
  {
    "game": "mines",
    "number": 15,
    "title": "进阶 · 5",
    "objective": "从左上角安全格出发，推理找出 7 颗雷，翻开全部安全格。",
    "size": 6,
    "mines": [
      4,
      9,
      10,
      12,
      25,
      27,
      34
    ],
    "mineCount": 7,
    "counts": [
      0,
      0,
      1,
      3,
      -1,
      2,
      1,
      1,
      1,
      -1,
      -1,
      2,
      -1,
      1,
      1,
      2,
      2,
      1,
      2,
      2,
      2,
      1,
      1,
      0,
      1,
      -1,
      2,
      -1,
      2,
      1,
      1,
      1,
      2,
      2,
      -1,
      1
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "reveal",
        "cell": 14
      },
      {
        "kind": "reveal",
        "cell": 13
      },
      {
        "kind": "reveal",
        "cell": 15
      },
      {
        "kind": "flag",
        "cell": 12
      },
      {
        "kind": "reveal",
        "cell": 18
      },
      {
        "kind": "reveal",
        "cell": 19
      },
      {
        "kind": "reveal",
        "cell": 20
      },
      {
        "kind": "reveal",
        "cell": 26
      },
      {
        "kind": "reveal",
        "cell": 31
      },
      {
        "kind": "reveal",
        "cell": 32
      },
      {
        "kind": "reveal",
        "cell": 33
      },
      {
        "kind": "flag",
        "cell": 25
      },
      {
        "kind": "flag",
        "cell": 27
      },
      {
        "kind": "reveal",
        "cell": 24
      },
      {
        "kind": "reveal",
        "cell": 21
      },
      {
        "kind": "reveal",
        "cell": 30
      },
      {
        "kind": "flag",
        "cell": 9
      },
      {
        "kind": "reveal",
        "cell": 16
      },
      {
        "kind": "reveal",
        "cell": 22
      },
      {
        "kind": "reveal",
        "cell": 28
      },
      {
        "kind": "reveal",
        "cell": 3
      },
      {
        "kind": "flag",
        "cell": 10
      },
      {
        "kind": "flag",
        "cell": 34
      },
      {
        "kind": "reveal",
        "cell": 17
      },
      {
        "kind": "reveal",
        "cell": 23
      },
      {
        "kind": "reveal",
        "cell": 11
      },
      {
        "kind": "reveal",
        "cell": 35
      },
      {
        "kind": "flag",
        "cell": 4
      },
      {
        "kind": "reveal",
        "cell": 5
      }
    ],
    "subsetDeductions": 4
  },
  {
    "game": "mines",
    "number": 16,
    "title": "挑战 · 1",
    "objective": "从左上角安全格出发，推理找出 8 颗雷，翻开全部安全格。",
    "size": 6,
    "mines": [
      3,
      5,
      14,
      15,
      25,
      30,
      34,
      35
    ],
    "mineCount": 8,
    "counts": [
      0,
      0,
      1,
      -1,
      2,
      -1,
      0,
      1,
      3,
      3,
      3,
      1,
      0,
      1,
      -1,
      -1,
      1,
      0,
      1,
      2,
      3,
      2,
      1,
      0,
      2,
      -1,
      1,
      1,
      2,
      2,
      -1,
      2,
      1,
      1,
      -1,
      -1
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "flag",
        "cell": 14
      },
      {
        "kind": "reveal",
        "cell": 20
      },
      {
        "kind": "flag",
        "cell": 15
      },
      {
        "kind": "reveal",
        "cell": 26
      },
      {
        "kind": "reveal",
        "cell": 31
      },
      {
        "kind": "reveal",
        "cell": 32
      },
      {
        "kind": "reveal",
        "cell": 33
      },
      {
        "kind": "flag",
        "cell": 30
      },
      {
        "kind": "reveal",
        "cell": 21
      },
      {
        "kind": "reveal",
        "cell": 16
      },
      {
        "kind": "reveal",
        "cell": 22
      },
      {
        "kind": "reveal",
        "cell": 27
      },
      {
        "kind": "reveal",
        "cell": 28
      },
      {
        "kind": "flag",
        "cell": 25
      },
      {
        "kind": "flag",
        "cell": 34
      },
      {
        "kind": "reveal",
        "cell": 9
      },
      {
        "kind": "reveal",
        "cell": 10
      },
      {
        "kind": "reveal",
        "cell": 11
      },
      {
        "kind": "reveal",
        "cell": 17
      },
      {
        "kind": "flag",
        "cell": 3
      },
      {
        "kind": "reveal",
        "cell": 24
      },
      {
        "kind": "flag",
        "cell": 35
      },
      {
        "kind": "reveal",
        "cell": 4
      }
    ],
    "subsetDeductions": 5
  },
  {
    "game": "mines",
    "number": 17,
    "title": "挑战 · 2",
    "objective": "从左上角安全格出发，推理找出 8 颗雷，翻开全部安全格。",
    "size": 6,
    "mines": [
      9,
      14,
      17,
      20,
      22,
      24,
      30,
      34
    ],
    "mineCount": 8,
    "counts": [
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      2,
      -1,
      2,
      1,
      0,
      2,
      -1,
      4,
      3,
      -1,
      1,
      3,
      -1,
      3,
      -1,
      2,
      -1,
      3,
      1,
      3,
      2,
      2,
      -1,
      2,
      0,
      1,
      -1,
      1
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "flag",
        "cell": 14
      },
      {
        "kind": "flag",
        "cell": 20
      },
      {
        "kind": "reveal",
        "cell": 15
      },
      {
        "kind": "reveal",
        "cell": 26
      },
      {
        "kind": "reveal",
        "cell": 21
      },
      {
        "kind": "reveal",
        "cell": 25
      },
      {
        "kind": "reveal",
        "cell": 27
      },
      {
        "kind": "reveal",
        "cell": 31
      },
      {
        "kind": "reveal",
        "cell": 32
      },
      {
        "kind": "flag",
        "cell": 24
      },
      {
        "kind": "flag",
        "cell": 30
      },
      {
        "kind": "flag",
        "cell": 22
      },
      {
        "kind": "reveal",
        "cell": 16
      },
      {
        "kind": "reveal",
        "cell": 28
      },
      {
        "kind": "flag",
        "cell": 34
      },
      {
        "kind": "reveal",
        "cell": 23
      },
      {
        "kind": "reveal",
        "cell": 29
      },
      {
        "kind": "reveal",
        "cell": 35
      },
      {
        "kind": "flag",
        "cell": 17
      },
      {
        "kind": "reveal",
        "cell": 11
      },
      {
        "kind": "reveal",
        "cell": 4
      },
      {
        "kind": "reveal",
        "cell": 5
      },
      {
        "kind": "flag",
        "cell": 9
      },
      {
        "kind": "reveal",
        "cell": 3
      }
    ],
    "subsetDeductions": 4
  },
  {
    "game": "mines",
    "number": 18,
    "title": "挑战 · 3",
    "objective": "从左上角安全格出发，推理找出 8 颗雷，翻开全部安全格。",
    "size": 6,
    "mines": [
      3,
      11,
      13,
      15,
      27,
      29,
      32,
      35
    ],
    "mineCount": 8,
    "counts": [
      0,
      0,
      1,
      -1,
      2,
      1,
      1,
      1,
      3,
      2,
      3,
      -1,
      1,
      -1,
      2,
      -1,
      2,
      1,
      1,
      1,
      3,
      2,
      3,
      1,
      0,
      1,
      2,
      -1,
      3,
      -1,
      0,
      1,
      -1,
      2,
      3,
      -1
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "reveal",
        "cell": 14
      },
      {
        "kind": "flag",
        "cell": 13
      },
      {
        "kind": "flag",
        "cell": 15
      },
      {
        "kind": "reveal",
        "cell": 12
      },
      {
        "kind": "reveal",
        "cell": 9
      },
      {
        "kind": "reveal",
        "cell": 19
      },
      {
        "kind": "reveal",
        "cell": 20
      },
      {
        "kind": "reveal",
        "cell": 21
      },
      {
        "kind": "flag",
        "cell": 3
      },
      {
        "kind": "reveal",
        "cell": 18
      },
      {
        "kind": "reveal",
        "cell": 24
      },
      {
        "kind": "reveal",
        "cell": 26
      },
      {
        "kind": "reveal",
        "cell": 4
      },
      {
        "kind": "reveal",
        "cell": 10
      },
      {
        "kind": "reveal",
        "cell": 16
      },
      {
        "kind": "flag",
        "cell": 27
      },
      {
        "kind": "flag",
        "cell": 32
      },
      {
        "kind": "reveal",
        "cell": 22
      },
      {
        "kind": "reveal",
        "cell": 28
      },
      {
        "kind": "reveal",
        "cell": 33
      },
      {
        "kind": "reveal",
        "cell": 34
      },
      {
        "kind": "flag",
        "cell": 29
      },
      {
        "kind": "flag",
        "cell": 35
      },
      {
        "kind": "reveal",
        "cell": 17
      },
      {
        "kind": "reveal",
        "cell": 23
      },
      {
        "kind": "flag",
        "cell": 11
      },
      {
        "kind": "reveal",
        "cell": 5
      }
    ],
    "subsetDeductions": 2
  },
  {
    "game": "mines",
    "number": 19,
    "title": "挑战 · 4",
    "objective": "从左上角安全格出发，推理找出 8 颗雷，翻开全部安全格。",
    "size": 6,
    "mines": [
      8,
      16,
      18,
      19,
      20,
      22,
      26,
      35
    ],
    "mineCount": 8,
    "counts": [
      0,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      -1,
      2,
      1,
      1,
      2,
      4,
      3,
      4,
      -1,
      2,
      -1,
      -1,
      -1,
      4,
      -1,
      2,
      2,
      4,
      -1,
      3,
      2,
      2,
      0,
      1,
      1,
      1,
      1,
      -1
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "flag",
        "cell": 18
      },
      {
        "kind": "flag",
        "cell": 19
      },
      {
        "kind": "reveal",
        "cell": 14
      },
      {
        "kind": "flag",
        "cell": 8
      },
      {
        "kind": "flag",
        "cell": 20
      },
      {
        "kind": "reveal",
        "cell": 2
      },
      {
        "kind": "reveal",
        "cell": 9
      },
      {
        "kind": "reveal",
        "cell": 15
      },
      {
        "kind": "reveal",
        "cell": 21
      },
      {
        "kind": "reveal",
        "cell": 3
      },
      {
        "kind": "reveal",
        "cell": 4
      },
      {
        "kind": "flag",
        "cell": 16
      },
      {
        "kind": "flag",
        "cell": 22
      },
      {
        "kind": "reveal",
        "cell": 17
      },
      {
        "kind": "reveal",
        "cell": 23
      },
      {
        "kind": "reveal",
        "cell": 28
      },
      {
        "kind": "reveal",
        "cell": 29
      },
      {
        "kind": "reveal",
        "cell": 27
      },
      {
        "kind": "reveal",
        "cell": 33
      },
      {
        "kind": "flag",
        "cell": 26
      },
      {
        "kind": "reveal",
        "cell": 32
      },
      {
        "kind": "reveal",
        "cell": 34
      },
      {
        "kind": "flag",
        "cell": 35
      },
      {
        "kind": "reveal",
        "cell": 25
      },
      {
        "kind": "reveal",
        "cell": 31
      },
      {
        "kind": "reveal",
        "cell": 24
      },
      {
        "kind": "reveal",
        "cell": 30
      }
    ],
    "subsetDeductions": 2
  },
  {
    "game": "mines",
    "number": 20,
    "title": "挑战 · 5",
    "objective": "从左上角安全格出发，推理找出 8 颗雷，翻开全部安全格。",
    "size": 6,
    "mines": [
      2,
      3,
      14,
      21,
      23,
      28,
      29,
      30
    ],
    "mineCount": 8,
    "counts": [
      0,
      1,
      -1,
      -1,
      1,
      0,
      0,
      2,
      3,
      3,
      1,
      0,
      0,
      1,
      -1,
      2,
      2,
      1,
      0,
      1,
      2,
      -1,
      4,
      -1,
      1,
      1,
      1,
      2,
      -1,
      -1,
      -1,
      1,
      0,
      1,
      2,
      2
    ],
    "solution": [
      {
        "kind": "reveal",
        "cell": 0
      },
      {
        "kind": "flag",
        "cell": 14
      },
      {
        "kind": "reveal",
        "cell": 20
      },
      {
        "kind": "reveal",
        "cell": 26
      },
      {
        "kind": "reveal",
        "cell": 32
      },
      {
        "kind": "reveal",
        "cell": 8
      },
      {
        "kind": "flag",
        "cell": 30
      },
      {
        "kind": "flag",
        "cell": 21
      },
      {
        "kind": "flag",
        "cell": 2
      },
      {
        "kind": "reveal",
        "cell": 15
      },
      {
        "kind": "reveal",
        "cell": 9
      },
      {
        "kind": "reveal",
        "cell": 10
      },
      {
        "kind": "reveal",
        "cell": 16
      },
      {
        "kind": "reveal",
        "cell": 22
      },
      {
        "kind": "flag",
        "cell": 3
      },
      {
        "kind": "reveal",
        "cell": 4
      },
      {
        "kind": "reveal",
        "cell": 5
      },
      {
        "kind": "flag",
        "cell": 23
      },
      {
        "kind": "flag",
        "cell": 28
      },
      {
        "kind": "flag",
        "cell": 29
      },
      {
        "kind": "reveal",
        "cell": 34
      },
      {
        "kind": "reveal",
        "cell": 35
      }
    ],
    "subsetDeductions": 2
  }
];
