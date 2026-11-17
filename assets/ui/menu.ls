{
  "_$ver": 1,
  "_$id": "2wk6ott4",
  "_$type": "Scene",
  "left": 0,
  "right": 0,
  "top": 0,
  "bottom": 0,
  "name": "Scene2D",
  "width": 1170,
  "height": 2532,
  "mouseThrough": true,
  "drawCallOptimize": true,
  "_$comp": [
    {
      "_$type": "a04eb34b-6b97-49a8-9bba-52ca2093a1b2",
      "scriptPath": "../src/slecet.ts"
    }
  ],
  "_$child": [
    {
      "_$id": "sfv1iwzb",
      "_$type": "GImage",
      "name": "img",
      "width": 1181,
      "height": 2534,
      "relations": [
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "2wk6ott4"
          },
          "data": [
            3,
            0,
            10,
            0,
            20,
            0,
            24,
            0
          ]
        }
      ],
      "src": "res://2d60dd33-40dc-4ef8-a1bd-1b50bd145a77",
      "autoSize": false
    },
    {
      "_$id": "xyewy7mo",
      "_$type": "GBox",
      "name": "top",
      "y": -1,
      "width": 1177,
      "height": 193,
      "_mouseState": 2,
      "mouseThrough": true,
      "zIndex": 1,
      "background": {
        "_$type": "DrawRectCmd",
        "fillColor": "rgba(255,255,255,0.5)"
      },
      "relations": [
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "2wk6ott4"
          },
          "data": [
            1,
            0,
            10,
            0,
            17,
            0,
            20,
            0
          ]
        }
      ],
      "_$child": [
        {
          "_$id": "gwa5f0kj",
          "_$type": "GBox",
          "name": "3",
          "x": 20,
          "width": 845,
          "height": 189,
          "zIndex": 1,
          "_$child": [
            {
              "_$id": "zhrgi0ah",
              "_$type": "GBox",
              "name": "Box",
              "y": 1,
              "width": 762,
              "height": 188,
              "_mouseState": 2,
              "mouseThrough": true,
              "zIndex": 1,
              "_$child": [
                {
                  "_$id": "0fchmmfc",
                  "_$type": "GImage",
                  "name": "img",
                  "width": 285,
                  "height": 285,
                  "scaleX": 0.65,
                  "scaleY": 0.65,
                  "zIndex": 5,
                  "src": "res://1db488ac-46f4-4fc2-8f26-3ea5026a467e"
                },
                {
                  "_$id": "3szf7z63",
                  "_$type": "GBox",
                  "name": "Tex",
                  "x": 200,
                  "y": 9,
                  "width": 521,
                  "height": 169,
                  "_$child": [
                    {
                      "_$id": "nc7h8m2b",
                      "_$type": "GTextField",
                      "name": "name",
                      "width": 242,
                      "height": 61,
                      "zIndex": 3,
                      "text": "name",
                      "font": "STXinwei",
                      "fontSize": 50,
                      "valign": "middle",
                      "padding": [
                        0,
                        0,
                        0,
                        0
                      ]
                    },
                    {
                      "_$id": "am5wwz6x",
                      "_$type": "GTextField",
                      "name": "id",
                      "y": 61,
                      "width": 242,
                      "height": 61,
                      "zIndex": 3,
                      "text": "ID:\n",
                      "font": "STXinwei",
                      "fontSize": 50,
                      "valign": "middle",
                      "padding": [
                        0,
                        0,
                        0,
                        0
                      ]
                    },
                    {
                      "_$id": "wyfw45sz",
                      "_$type": "GTextField",
                      "name": "flag",
                      "y": 122,
                      "width": 242,
                      "height": 61,
                      "zIndex": 3,
                      "text": "美好的一天开始喽！\n",
                      "font": "STXinwei",
                      "fontSize": 50,
                      "valign": "middle",
                      "padding": [
                        0,
                        0,
                        0,
                        0
                      ]
                    }
                  ]
                },
                {
                  "_$id": "3zmplpqd",
                  "_$type": "GImage",
                  "name": "di",
                  "x": 700,
                  "y": 20,
                  "width": 220,
                  "height": 220,
                  "scaleX": 0.5,
                  "scaleY": 0.5,
                  "src": "res://0d1dd1ce-910d-4029-8c06-2af375d3d3cf"
                },
                {
                  "_$id": "ivyhmtpx",
                  "_$type": "GTextField",
                  "name": "dollar",
                  "x": 825,
                  "y": 45,
                  "width": 242,
                  "height": 61,
                  "zIndex": 3,
                  "text": "0\n",
                  "font": "STXinwei",
                  "fontSize": 50,
                  "color": "#ffa800",
                  "valign": "middle",
                  "padding": [
                    0,
                    0,
                    0,
                    0
                  ]
                }
              ]
            }
          ]
        },
        {
          "_$id": "tcgodxm8",
          "_$type": "GBox",
          "name": "4",
          "x": 899,
          "width": 271,
          "height": 189,
          "_$child": [
            {
              "_$id": "pk6j3l6v",
              "_$type": "GBox",
              "name": "Box",
              "x": 12,
              "y": 10,
              "width": 248,
              "height": 169,
              "alpha": 0.32,
              "_$child": [
                {
                  "_$id": "nfk4jmqs",
                  "_$type": "GImage",
                  "name": "img",
                  "x": 67,
                  "width": 284,
                  "height": 276,
                  "scaleX": 0.4,
                  "scaleY": 0.4,
                  "zIndex": 4,
                  "src": "res://f20054e4-70ce-4cd8-a920-927d2f0fe6f3"
                },
                {
                  "_$id": "b1pce6lf",
                  "_$type": "GTextField",
                  "name": "t4",
                  "y": 110,
                  "width": 250,
                  "height": 63,
                  "text": "设置",
                  "font": "STXinwei",
                  "fontSize": 50,
                  "align": "center",
                  "valign": "middle",
                  "padding": [
                    0,
                    0,
                    0,
                    0
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "_$id": "qelj0un4",
      "_$type": "GBox",
      "name": "botton",
      "x": 2,
      "y": 2229,
      "width": 1174,
      "height": 303,
      "_mouseState": 2,
      "mouseThrough": true,
      "zIndex": 1,
      "background": {
        "_$type": "DrawRectCmd",
        "fillColor": "rgba(255,255,255,0.5)"
      },
      "relations": [
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "2wk6ott4"
          },
          "data": [
            1,
            0,
            16,
            0,
            17,
            0,
            20,
            0
          ]
        }
      ],
      "_$child": [
        {
          "_$id": "pbslvtkf",
          "_$type": "GBox",
          "name": "1",
          "width": 380,
          "height": 300,
          "_$child": [
            {
              "_$id": "jimqjosd",
              "_$type": "GBox",
              "name": "Box",
              "x": 19,
              "y": 10,
              "width": 343,
              "height": 260,
              "alpha": 0.32,
              "_$child": [
                {
                  "_$id": "ckzd4yjj",
                  "_$type": "GImage",
                  "name": "img",
                  "x": 171,
                  "y": 93,
                  "width": 361,
                  "height": 310,
                  "anchorX": 0.5,
                  "anchorY": 0.5,
                  "scaleX": 0.6,
                  "scaleY": 0.6,
                  "zIndex": 2,
                  "src": "res://5ae60b3b-a787-4e96-a8f6-bba0e67a000a"
                },
                {
                  "_$id": "xhf3efw4",
                  "_$type": "GTextField",
                  "name": "t1",
                  "y": 186,
                  "width": 303,
                  "height": 100,
                  "zIndex": 2,
                  "text": "商店",
                  "font": "STXinwei",
                  "fontSize": 50,
                  "align": "center",
                  "valign": "middle",
                  "padding": [
                    0,
                    0,
                    0,
                    0
                  ]
                }
              ]
            }
          ]
        },
        {
          "_$id": "u0o5njx1",
          "_$type": "GBox",
          "name": "0",
          "x": 380,
          "width": 380,
          "height": 300,
          "zIndex": 1,
          "_$child": [
            {
              "_$id": "iya64zxl",
              "_$type": "GBox",
              "name": "Box",
              "x": -15,
              "y": 20,
              "width": 410,
              "height": 260,
              "zIndex": 1,
              "_$child": [
                {
                  "_$id": "qpga5swi",
                  "_$type": "GImage",
                  "name": "img",
                  "x": 205,
                  "y": 87,
                  "width": 387,
                  "height": 291,
                  "anchorX": 0.5,
                  "anchorY": 0.5,
                  "scaleX": 0.6,
                  "scaleY": 0.6,
                  "zIndex": 2,
                  "src": "res://f8865d79-b969-448c-a154-57177918d56c"
                },
                {
                  "_$id": "zcixl92i",
                  "_$type": "GTextField",
                  "name": "t0",
                  "y": 175,
                  "width": 414,
                  "height": 100,
                  "zIndex": 2,
                  "text": "游戏",
                  "font": "STXinwei",
                  "fontSize": 50,
                  "align": "center",
                  "valign": "middle",
                  "padding": [
                    0,
                    0,
                    0,
                    0
                  ]
                }
              ]
            }
          ]
        },
        {
          "_$id": "lw3lchh0",
          "_$type": "GBox",
          "name": "2",
          "x": 760,
          "width": 380,
          "height": 300,
          "_$child": [
            {
              "_$id": "y9vuqbht",
              "_$type": "GBox",
              "name": "Box",
              "x": -15,
              "y": 20,
              "width": 410,
              "height": 260,
              "alpha": 0.32,
              "_$child": [
                {
                  "_$id": "qxndidla",
                  "_$type": "GImage",
                  "name": "img",
                  "x": 205,
                  "y": 83,
                  "width": 323,
                  "height": 275,
                  "anchorX": 0.5,
                  "anchorY": 0.5,
                  "scaleX": 0.6,
                  "scaleY": 0.6,
                  "src": "res://d6efa12e-1253-41e5-b856-df4beb071b3d"
                },
                {
                  "_$id": "apbpqorh",
                  "_$type": "GTextField",
                  "name": "t2",
                  "y": 165,
                  "width": 414,
                  "height": 100,
                  "text": "社交",
                  "font": "STXinwei",
                  "fontSize": 50,
                  "align": "center",
                  "valign": "middle",
                  "padding": [
                    0,
                    0,
                    0,
                    0
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "_$id": "yfk534ud",
      "_$type": "GPanel",
      "name": "list",
      "y": 191,
      "width": 1168,
      "height": 2037,
      "zIndex": 1,
      "controllers": {
        "_$type": "Record",
        "c0": {
          "_$type": "Controller",
          "pages": [
            "",
            "",
            "",
            "",
            ""
          ],
          "_editingIndex": 2
        }
      },
      "_startPages": {
        "_$type": "Record"
      }
    },
    {
      "_$id": "6g5g2x99",
      "_$type": "GBox",
      "name": "item0",
      "y": 189,
      "width": 1175,
      "height": 2038,
      "_mouseState": 2,
      "mouseThrough": true,
      "zIndex": 1,
      "gears": [
        {
          "_$type": "GearDisplay",
          "controller": {
            "_$ref": "yfk534ud",
            "_$ctrl": "c0"
          },
          "pages": [
            0
          ],
          "condition": 1
        }
      ],
      "relations": [
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "xyewy7mo"
          },
          "data": [
            1,
            0,
            12,
            0
          ]
        },
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "qelj0un4"
          },
          "data": [
            23,
            0
          ]
        }
      ],
      "_$child": [
        {
          "_$id": "mu81yr4b",
          "_$type": "GBox",
          "name": "box",
          "x": 3,
          "y": 434,
          "width": 1089,
          "height": 154,
          "_mouseState": 2,
          "mouseThrough": true,
          "zIndex": 1,
          "gears": [
            {
              "_$type": "GearDisplay",
              "controller": {
                "_$ref": "yfk534ud",
                "_$ctrl": "c0"
              },
              "pages": [
                0
              ],
              "condition": 1
            }
          ],
          "relations": [
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "1eb8h2kj"
              },
              "data": [
                3,
                1,
                14,
                1,
                20,
                0
              ]
            }
          ],
          "layout": {
            "type": 2,
            "columns": 2,
            "valign": 1
          },
          "_$child": [
            {
              "_$id": "lpn9nqit",
              "_$type": "GImage",
              "name": "img",
              "x": 144,
              "y": 77,
              "width": 287,
              "height": 287,
              "anchorX": 0.5,
              "anchorY": 0.5,
              "scaleX": 0.4,
              "scaleY": 0.4,
              "zIndex": 3,
              "src": "res://094b0cc1-58ee-4e6d-9c09-c5e3250654ea"
            },
            {
              "_$id": "w2a00pkm",
              "_$type": "GTextField",
              "name": "t2",
              "x": 287,
              "y": 27,
              "width": 265,
              "height": 100,
              "text": "游戏列表",
              "font": "STXinwei",
              "fontSize": 50,
              "valign": "middle",
              "padding": [
                0,
                0,
                0,
                0
              ]
            }
          ]
        },
        {
          "_$id": "1eb8h2kj",
          "_$var": true,
          "_$type": "GList",
          "name": "gList",
          "x": 3,
          "y": 588,
          "width": 1175,
          "height": 635,
          "zIndex": 1,
          "background": {
            "_$type": "DrawRectCmd"
          },
          "relations": [
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "6g5g2x99"
              },
              "data": [
                1,
                0,
                6,
                0,
                13,
                0
              ]
            }
          ],
          "layout": {
            "type": 2,
            "columns": 3,
            "rowGap": 10,
            "columnGap": 40,
            "padding": [
              16,
              0,
              0,
              20
            ]
          },
          "scroller": {
            "_$type": "Scroller",
            "direction": 1,
            "barDisplay": 5,
            "barFloating": true
          },
          "_templateNode": {
            "_$ref": "w74q1tgm",
            "_$tmpl": "itemTemplate"
          },
          "_initItemNum": 3,
          "_$child": [
            {
              "_$id": "w74q1tgm",
              "_$type": "GBox",
              "name": "item",
              "width": 1074,
              "height": 623,
              "background": {
                "_$type": "DrawRectCmd"
              },
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "1eb8h2kj"
                  },
                  "data": [
                    13,
                    0
                  ]
                }
              ],
              "_$child": [
                {
                  "_$id": "i5wzwvee",
                  "_$type": "GImage",
                  "name": "Sprite",
                  "width": 1075,
                  "height": 600,
                  "zIndex": 1,
                  "relations": [
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "w74q1tgm"
                      },
                      "data": []
                    }
                  ],
                  "src": "",
                  "autoSize": false
                },
                {
                  "_$id": "r35gsn1g",
                  "_$type": "GImage",
                  "name": "img",
                  "y": 558,
                  "width": 1074,
                  "height": 42,
                  "alpha": 0.5,
                  "zIndex": 2,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "width": 0,
                    "lineWidth": 1,
                    "fillColor": "#ffffff"
                  },
                  "relations": [
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "i5wzwvee"
                      },
                      "data": [
                        1,
                        0,
                        3,
                        0,
                        17,
                        0,
                        20,
                        0
                      ]
                    }
                  ],
                  "src": "",
                  "autoSize": false
                }
              ]
            }
          ]
        },
        {
          "_$id": "gn69nx97",
          "_$type": "GBox",
          "name": "box",
          "x": 123,
          "y": 1380,
          "width": 934,
          "height": 446,
          "relations": [
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "1eb8h2kj"
              },
              "data": [
                6,
                0,
                10,
                1
              ]
            }
          ],
          "layout": {
            "type": 1,
            "rowGap": 35,
            "columnGap": 52,
            "align": 1
          },
          "_$child": [
            {
              "_$id": "sy7euxs7",
              "_$type": "GTextField",
              "name": "gameShow",
              "x": 285,
              "width": 364,
              "height": 71,
              "text": "健康游戏忠告",
              "fontSize": 60,
              "fitContent": 1
            },
            {
              "_$id": "ui1cokn5",
              "_$type": "GTextField",
              "name": "gameShow_1",
              "x": 10,
              "y": 106,
              "width": 914,
              "height": 302,
              "text": "抵制不良游戏，拒绝盗版游戏。\n注意自我保护，谨防受骗上当。\n适度游戏益脑，沉迷游戏伤身。\n合理安排时间，享受健康生活。",
              "fontSize": 65,
              "fitContent": 1
            }
          ]
        }
      ]
    },
    {
      "_$id": "2j8mr0ac",
      "_$type": "GBox",
      "name": "item1",
      "y": 194,
      "width": 1175,
      "height": 2036,
      "_mouseState": 2,
      "mouseThrough": true,
      "zIndex": 1,
      "gears": [
        {
          "_$type": "GearDisplay",
          "controller": {
            "_$ref": "yfk534ud",
            "_$ctrl": "c0"
          },
          "pages": [
            1
          ],
          "condition": 1
        }
      ],
      "relations": [
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "xyewy7mo"
          },
          "data": [
            1,
            0,
            12,
            0
          ]
        },
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "qelj0un4"
          },
          "data": [
            23,
            0
          ]
        }
      ],
      "_$child": [
        {
          "_$id": "adz7rwx6",
          "_$type": "GBox",
          "name": "shopb",
          "x": 59,
          "y": 34,
          "width": 743,
          "height": 461,
          "relations": [
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "2j8mr0ac"
              },
              "data": [
                3,
                1,
                10,
                1
              ]
            },
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "adz7rwx6"
              },
              "data": [
                12,
                0
              ]
            }
          ],
          "_$child": [
            {
              "_$id": "3r1nwt0r",
              "_$prefab": "b0c7f4b6-9a33-4cd8-897e-4888efe760fe",
              "name": "sButton",
              "active": true,
              "x": 427,
              "y": 229,
              "width": 261,
              "height": 123,
              "visible": true,
              "title": "购买",
              "titleColor": "#000000",
              "titleFontSize": 70,
              "selectedTitle": "购买",
              "sound": "",
              "_$child": [
                {
                  "_$override": "ug1dmopr",
                  "src": "",
                  "color": "#ffdddd",
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 40,
                    "rt": 40,
                    "lb": 40,
                    "rb": 40,
                    "lineWidth": 20,
                    "lineColor": "#b67930",
                    "fillColor": "#bf7625"
                  }
                },
                {
                  "_$override": "asxzquct",
                  "src": "",
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 40,
                    "rt": 40,
                    "lb": 40,
                    "rb": 40,
                    "lineWidth": 20,
                    "lineColor": "#c19248",
                    "fillColor": "#a18040"
                  }
                },
                {
                  "_$override": "syt0gdq4",
                  "src": "",
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 40,
                    "rt": 40,
                    "lb": 40,
                    "rb": 40,
                    "lineWidth": 20,
                    "lineColor": "#da742d",
                    "fillColor": "#f28214"
                  }
                },
                {
                  "_$override": "kahpmowa",
                  "color": "#000000",
                  "text": "购买",
                  "font": "STXinwei",
                  "fontSize": 70
                }
              ]
            },
            {
              "_$id": "nrbymg64",
              "_$type": "GImage",
              "name": "show",
              "x": 36,
              "y": 82,
              "width": 361,
              "height": 310,
              "mouseThrough": true,
              "src": "res://5ae60b3b-a787-4e96-a8f6-bba0e67a000a"
            },
            {
              "_$id": "p0dcgg1m",
              "_$type": "GTextField",
              "name": "mName",
              "x": 403,
              "y": 82,
              "width": 394,
              "height": 124,
              "text": "商品信息",
              "font": "STZhongsong",
              "fontSize": 80,
              "color": "#474747",
              "bold": true,
              "html": true,
              "valign": "middle",
              "padding": [
                0,
                0,
                0,
                0
              ],
              "strokeColor": "#ffffff"
            }
          ]
        },
        {
          "_$id": "k6pw36ir",
          "_$var": true,
          "_$type": "GList",
          "name": "sList",
          "x": 23,
          "y": 501,
          "width": 1135,
          "height": 1079,
          "mouseThrough": true,
          "zIndex": 1,
          "background": {
            "_$type": "DrawRoundRectCmd",
            "lineWidth": 1,
            "lineColor": "#000000"
          },
          "relations": [
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "2j8mr0ac"
              },
              "data": [
                1,
                1,
                6,
                0,
                23,
                0
              ]
            },
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "adz7rwx6"
              },
              "data": [
                12,
                0
              ]
            }
          ],
          "layout": {
            "type": 3,
            "rows": 4,
            "align": 3,
            "valign": 3
          },
          "scroller": {
            "_$type": "Scroller",
            "barDisplay": 3,
            "barFloating": true,
            "pageMode": true
          },
          "_templateNode": {
            "_$ref": "0qawqr6p",
            "_$tmpl": "itemTemplate"
          },
          "_initItemNum": 50,
          "_isDemo": true,
          "_$child": [
            {
              "_$id": "0qawqr6p",
              "_$type": "GBox",
              "name": "sBox",
              "width": 277,
              "height": 269,
              "_$child": [
                {
                  "_$id": "d2vkgiwv",
                  "_$type": "GImage",
                  "name": "img",
                  "x": 26,
                  "y": 16,
                  "width": 287,
                  "height": 287,
                  "scaleX": 0.8,
                  "scaleY": 0.8,
                  "zIndex": 1,
                  "relations": [
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "0qawqr6p"
                      },
                      "data": [
                        6,
                        0,
                        13,
                        0
                      ]
                    }
                  ],
                  "src": "res://094b0cc1-58ee-4e6d-9c09-c5e3250654ea"
                },
                {
                  "_$id": "nu49xaqs",
                  "_$type": "GTextField",
                  "name": "t",
                  "x": 182,
                  "y": 198,
                  "width": 98,
                  "height": 69,
                  "zIndex": 2,
                  "relations": [
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "0qawqr6p"
                      },
                      "data": [
                        9,
                        0,
                        16,
                        0
                      ]
                    }
                  ],
                  "text": "x1",
                  "font": "STXinwei",
                  "fontSize": 60,
                  "color": "#ffffff",
                  "html": true,
                  "align": "center",
                  "valign": "middle",
                  "stroke": 2
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "_$id": "ng6b6usl",
      "_$type": "GBox",
      "name": "item2",
      "y": 192,
      "width": 1175,
      "height": 2034,
      "_mouseState": 2,
      "mouseThrough": true,
      "zIndex": 1,
      "gears": [
        {
          "_$type": "GearDisplay",
          "controller": {
            "_$ref": "yfk534ud",
            "_$ctrl": "c0"
          },
          "pages": [
            2
          ],
          "condition": 1
        }
      ],
      "relations": [
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "xyewy7mo"
          },
          "data": [
            1,
            0,
            12,
            0
          ]
        },
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "qelj0un4"
          },
          "data": [
            23,
            0
          ]
        }
      ],
      "_$child": [
        {
          "_$id": "soc00000",
          "_$type": "GBox",
          "name": "socHome",
          "width": 1175,
          "height": 2034,
          "relations": [
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                1,
                0
              ]
            },
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                2,
                0
              ]
            },
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                3,
                0
              ]
            },
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                10,
                0
              ]
            }
          ],
          "_$child": [
            {
              "_$id": "soc00001",
              "_$type": "GBox",
              "name": "socTop",
              "width": 1175,
              "height": 140,
              "background": {
                "_$type": "DrawRectCmd",
                "fillColor": "#ededed"
              },
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc00000"
                  },
                  "data": [
                    1,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc00000"
                  },
                  "data": [
                    3,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc00000"
                  },
                  "data": [
                    10,
                    0
                  ]
                }
              ],
              "_$child": [
                {
                  "_$id": "soc00002",
                  "_$type": "GTextField",
                  "name": "socTitle",
                  "x": 40,
                  "width": 400,
                  "height": 140,
                  "_mouseState": 1,
                  "text": "消息",
                  "font": "STZhongsong",
                  "fontSize": 64,
                  "color": "#191919",
                  "bold": true,
                  "valign": "middle"
                },
                {
                  "_$id": "soc00003",
                  "_$type": "GTextField",
                  "name": "socAddBtn",
                  "x": 1035,
                  "y": 20,
                  "width": 100,
                  "height": 100,
                  "_mouseState": 2,
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 8,
                    "rt": 8,
                    "lb": 8,
                    "rb": 8,
                    "fillColor": "#ffffff"
                  },
                  "text": "+",
                  "font": "STZhongsong",
                  "fontSize": 64,
                  "color": "#07c160",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                },
                {
                  "_$id": "socx0000",
                  "_$type": "GTextField",
                  "name": "badgePlus",
                  "x": 1105,
                  "y": 10,
                  "width": 60,
                  "height": 60,
                  "visible": false,
                  "_mouseState": 1,
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 30,
                    "rt": 30,
                    "lb": 30,
                    "rb": 30,
                    "fillColor": "#fa5151"
                  },
                  "text": "0",
                  "font": "STZhongsong",
                  "fontSize": 32,
                  "color": "#ffffff",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                }
              ]
            },
            {
              "_$id": "soc0000a",
              "_$type": "GList",
              "name": "convList",
              "y": 140,
              "width": 1175,
              "height": 1894,
              "mouseThrough": true,
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc00000"
                  },
                  "data": [
                    1,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc00000"
                  },
                  "data": [
                    3,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc00001"
                  },
                  "data": [
                    12,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc00000"
                  },
                  "data": [
                    24,
                    0
                  ]
                }
              ],
              "layout": {
                "type": 1
              },
              "scroller": {
                "_$type": "Scroller",
                "barDisplay": 3,
                "barFloating": true
              },
              "_templateNode": {
                "_$ref": "soc00004",
                "_$tmpl": "itemTemplate"
              },
              "_initItemNum": null,
              "_$child": [
                {
                  "_$id": "soc00004",
                  "_$type": "GBox",
                  "name": "convItem",
                  "width": 1175,
                  "height": 180,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "lineWidth": 1,
                    "lineColor": "#e6e6e6",
                    "fillColor": "#ffffff"
                  },
                  "_$child": [
                    {
                      "_$id": "soc00005",
                      "_$type": "GImage",
                      "name": "head",
                      "x": 30,
                      "y": 30,
                      "width": 120,
                      "height": 120,
                      "_mouseState": 1,
                      "background": {
                        "_$type": "DrawRoundRectCmd",
                        "lt": 8,
                        "rt": 8,
                        "lb": 8,
                        "rb": 8,
                        "fillColor": "#e0e0e0"
                      },
                      "src": ""
                    },
                    {
                      "_$id": "soc00006",
                      "_$type": "GTextField",
                      "name": "name",
                      "x": 180,
                      "y": 28,
                      "width": 700,
                      "height": 64,
                      "_mouseState": 1,
                      "text": "名字",
                      "font": "STZhongsong",
                      "fontSize": 48,
                      "color": "#191919",
                      "valign": "middle"
                    },
                    {
                      "_$id": "soc00007",
                      "_$type": "GTextField",
                      "name": "last",
                      "x": 180,
                      "y": 100,
                      "width": 760,
                      "height": 56,
                      "_mouseState": 1,
                      "text": "最后一条消息",
                      "font": "STZhongsong",
                      "fontSize": 36,
                      "color": "#999999",
                      "valign": "middle"
                    },
                    {
                      "_$id": "soc00008",
                      "_$type": "GTextField",
                      "name": "time",
                      "x": 960,
                      "y": 30,
                      "width": 180,
                      "height": 50,
                      "_mouseState": 1,
                      "text": "",
                      "font": "STZhongsong",
                      "fontSize": 30,
                      "color": "#b2b2b2",
                      "align": "right",
                      "valign": "middle"
                    },
                    {
                      "_$id": "soc00009",
                      "_$type": "GTextField",
                      "name": "badge",
                      "x": 1080,
                      "y": 95,
                      "width": 70,
                      "height": 70,
                      "visible": false,
                      "_mouseState": 1,
                      "background": {
                        "_$type": "DrawRoundRectCmd",
                        "lt": 35,
                        "rt": 35,
                        "lb": 35,
                        "rb": 35,
                        "fillColor": "#fa5151"
                      },
                      "text": "0",
                      "font": "STZhongsong",
                      "fontSize": 32,
                      "color": "#ffffff",
                      "align": "center",
                      "valign": "middle"
                    }
                  ]
                }
              ]
            },
            {
              "_$id": "soc0000b",
              "_$type": "GTextField",
              "name": "convEmpty",
              "y": 600,
              "width": 1175,
              "height": 120,
              "visible": false,
              "_mouseState": 1,
              "text": "暂无会话，点右上角「加好友」",
              "font": "STZhongsong",
              "fontSize": 40,
              "color": "#b2b2b2",
              "align": "center",
              "valign": "middle"
            },
            {
              "_$id": "sox00000",
              "_$type": "GBox",
              "name": "socPlusMenu",
              "x": 830,
              "y": 150,
              "width": 320,
              "height": 300,
              "visible": false,
              "background": {
                "_$type": "DrawRoundRectCmd",
                "lt": 8,
                "rt": 8,
                "lb": 8,
                "rb": 8,
                "lineWidth": 1,
                "lineColor": "#d0d0d0",
                "fillColor": "#ffffff"
              },
              "_$child": [
                {
                  "_$id": "sox00001",
                  "_$type": "GTextField",
                  "name": "pmAddFriend",
                  "x": 10,
                  "y": 10,
                  "width": 300,
                  "height": 85,
                  "_mouseState": 2,
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 8,
                    "rt": 8,
                    "lb": 8,
                    "rb": 8,
                    "fillColor": "#07c160"
                  },
                  "text": "加好友",
                  "font": "STZhongsong",
                  "fontSize": 40,
                  "color": "#fff",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                },
                {
                  "_$id": "sox00002",
                  "_$type": "GTextField",
                  "name": "pmCreateGroup",
                  "x": 10,
                  "y": 105,
                  "width": 300,
                  "height": 85,
                  "_mouseState": 2,
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 8,
                    "rt": 8,
                    "lb": 8,
                    "rb": 8,
                    "fillColor": "#07c160"
                  },
                  "text": "创建群聊",
                  "font": "STZhongsong",
                  "fontSize": 40,
                  "color": "#fff",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                },
                {
                  "_$id": "socx0001",
                  "_$type": "GTextField",
                  "name": "pmNewChat",
                  "x": 10,
                  "y": 200,
                  "width": 300,
                  "height": 85,
                  "_mouseState": 2,
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 8,
                    "rt": 8,
                    "lb": 8,
                    "rb": 8,
                    "fillColor": "#07c160"
                  },
                  "text": "创建新聊天",
                  "font": "STZhongsong",
                  "fontSize": 40,
                  "color": "#ffffff",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                }
              ]
            }
          ]
        },
        {
          "_$id": "soc0000c",
          "_$type": "GBox",
          "name": "socChat",
          "width": 1175,
          "height": 2034,
          "visible": false,
          "relations": [
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                1,
                0
              ]
            },
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                2,
                0
              ]
            },
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                3,
                0
              ]
            },
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                10,
                0
              ]
            }
          ],
          "_$child": [
            {
              "_$id": "soc0000d",
              "_$type": "GBox",
              "name": "chatTop",
              "width": 1175,
              "height": 140,
              "background": {
                "_$type": "DrawRectCmd",
                "fillColor": "#ededed"
              },
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000c"
                  },
                  "data": [
                    1,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000c"
                  },
                  "data": [
                    3,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000c"
                  },
                  "data": [
                    10,
                    0
                  ]
                }
              ],
              "_$child": [
                {
                  "_$id": "soc0000e",
                  "_$type": "GTextField",
                  "name": "chatBack",
                  "x": 20,
                  "y": 20,
                  "width": 160,
                  "height": 100,
                  "_mouseState": 2,
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 8,
                    "rt": 8,
                    "lb": 8,
                    "rb": 8,
                    "fillColor": "#ffffff"
                  },
                  "text": "‹ 返回",
                  "font": "STZhongsong",
                  "fontSize": 44,
                  "color": "#191919",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                },
                {
                  "_$id": "soc0000f",
                  "_$type": "GTextField",
                  "name": "chatTitle",
                  "x": 200,
                  "width": 900,
                  "height": 140,
                  "_mouseState": 1,
                  "text": "会话",
                  "font": "STZhongsong",
                  "fontSize": 56,
                  "color": "#191919",
                  "bold": true,
                  "valign": "middle"
                },
                {
                  "_$id": "socx0002",
                  "_$type": "GTextField",
                  "name": "chatMenuBtn",
                  "x": 1055,
                  "y": 20,
                  "width": 100,
                  "height": 100,
                  "_mouseState": 2,
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 8,
                    "rt": 8,
                    "lb": 8,
                    "rb": 8,
                    "lineWidth": 1,
                    "lineColor": "#d0d0d0",
                    "fillColor": "#ffffff"
                  },
                  "text": "≡",
                  "font": "STZhongsong",
                  "fontSize": 60,
                  "color": "#191919",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                }
              ]
            },
            {
              "_$id": "soc0000j",
              "_$type": "GList",
              "name": "msgList",
              "y": 140,
              "width": 1175,
              "height": 1744,
              "mouseThrough": true,
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000c"
                  },
                  "data": [
                    1,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000c"
                  },
                  "data": [
                    3,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000d"
                  },
                  "data": [
                    12,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000c"
                  },
                  "data": [
                    24,
                    0
                  ]
                }
              ],
              "layout": {
                "type": 1
              },
              "scroller": {
                "_$type": "Scroller",
                "barDisplay": 3,
                "barFloating": true
              },
              "_templateNode": {
                "_$ref": "soc0000g",
                "_$tmpl": "itemTemplate"
              },
              "_initItemNum": null,
              "_$child": [
                {
                  "_$id": "soc0000g",
                  "_$type": "GBox",
                  "name": "msgItem",
                  "width": 1175,
                  "height": 150,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "lineWidth": 1,
                    "lineColor": "#e6e6e6",
                    "fillColor": "#ffffff"
                  },
                  "_$child": [
                    {
                      "_$id": "soc0000h",
                      "_$type": "GTextField",
                      "name": "mname",
                      "x": 30,
                      "y": 8,
                      "width": 700,
                      "height": 44,
                      "_mouseState": 1,
                      "text": "",
                      "font": "STZhongsong",
                      "fontSize": 32,
                      "color": "#999999",
                      "valign": "middle"
                    },
                    {
                      "_$id": "soc0000i",
                      "_$type": "GTextField",
                      "name": "mtext",
                      "x": 30,
                      "y": 52,
                      "width": 1115,
                      "height": 90,
                      "_mouseState": 1,
                      "text": "",
                      "font": "STZhongsong",
                      "fontSize": 40,
                      "color": "#191919",
                      "valign": "middle"
                    }
                  ]
                }
              ]
            },
            {
              "_$id": "soc0000k",
              "_$type": "GTextField",
              "name": "msgEmpty",
              "y": 600,
              "width": 1175,
              "height": 120,
              "visible": false,
              "_mouseState": 1,
              "text": "还没有消息，说点什么吧",
              "font": "STZhongsong",
              "fontSize": 40,
              "color": "#b2b2b2",
              "align": "center",
              "valign": "middle"
            },
            {
              "_$id": "2ejat9mh",
              "_$type": "GBox",
              "name": "mmbox",
              "x": 7,
              "y": 1848,
              "width": 1157,
              "height": 239,
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000c"
                  },
                  "data": [
                    3,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000c"
                  },
                  "data": [
                    16,
                    0
                  ]
                }
              ],
              "_$child": [
                {
                  "_$id": "soc0000l",
                  "_$type": "GTextInput",
                  "name": "chatInp",
                  "x": 133,
                  "y": 56,
                  "width": 760,
                  "height": 110,
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 8,
                    "rt": 8,
                    "lb": 8,
                    "rb": 8,
                    "lineWidth": 1,
                    "lineColor": "#d0d0d0",
                    "fillColor": "#ffffff"
                  },
                  "relations": [
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "2ejat9mh"
                      },
                      "data": [
                        1,
                        1,
                        6,
                        0
                      ]
                    }
                  ],
                  "text": "",
                  "font": "STZhongsong",
                  "fontSize": 44,
                  "color": "#191919",
                  "valign": "middle",
                  "padding": [
                    16,
                    8,
                    16,
                    8
                  ],
                  "prompt": "输入消息…",
                  "promptColor": "#b2b2b2"
                },
                {
                  "_$id": "soc0000m",
                  "_$type": "GTextField",
                  "name": "chatSend",
                  "x": 913,
                  "y": 56,
                  "width": 235,
                  "height": 110,
                  "_mouseState": 2,
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 8,
                    "rt": 8,
                    "lb": 8,
                    "rb": 8,
                    "fillColor": "#07c160"
                  },
                  "relations": [
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "2ejat9mh"
                      },
                      "data": [
                        6,
                        0
                      ]
                    }
                  ],
                  "text": "发送",
                  "font": "STZhongsong",
                  "fontSize": 44,
                  "color": "#ffffff",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                },
                {
                  "_$id": "cfp00000",
                  "_$type": "GTextField",
                  "name": "chatFuncBtn",
                  "x": 13,
                  "y": 56,
                  "width": 100,
                  "height": 110,
                  "_mouseState": 2,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "lineWidth": 1,
                    "lineColor": "#d0d0d0",
                    "fillColor": "#ffffff"
                  },
                  "relations": [
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "2ejat9mh"
                      },
                      "data": [
                        6,
                        0
                      ]
                    }
                  ],
                  "text": "＋",
                  "font": "STZhongsong",
                  "fontSize": 60,
                  "color": "#191919",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                }
              ]
            },
            {
              "_$id": "socx0003",
              "_$type": "GBox",
              "name": "chatMenuPanel",
              "x": 700,
              "y": 150,
              "width": 460,
              "height": 900,
              "visible": false,
              "background": {
                "_$type": "DrawRoundRectCmd",
                "lt": 8,
                "rt": 8,
                "lb": 8,
                "rb": 8,
                "lineWidth": 1,
                "lineColor": "#d0d0d0",
                "fillColor": "#ffffff"
              },
              "_$child": [
                {
                  "_$id": "socx0007",
                  "_$type": "GTextField",
                  "name": "memTitle",
                  "x": 10,
                  "y": 10,
                  "width": 440,
                  "height": 60,
                  "_mouseState": 1,
                  "text": "成员",
                  "font": "STZhongsong",
                  "fontSize": 36,
                  "color": "#191919",
                  "bold": true,
                  "valign": "middle"
                },
                {
                  "_$id": "socx0008",
                  "_$type": "GList",
                  "name": "memList",
                  "x": 10,
                  "y": 80,
                  "width": 440,
                  "height": 560,
                  "mouseThrough": true,
                  "layout": {
                    "type": 1
                  },
                  "scroller": {
                    "_$type": "Scroller",
                    "barDisplay": 3,
                    "barFloating": true
                  },
                  "_templateNode": {
                    "_$ref": "socx0004",
                    "_$tmpl": "itemTemplate"
                  },
                  "_initItemNum": null,
                  "_$child": [
                    {
                      "_$id": "socx0004",
                      "_$type": "GBox",
                      "name": "memItem",
                      "width": 440,
                      "height": 90,
                      "background": {
                        "_$type": "DrawRectCmd",
                        "lineWidth": 1,
                        "lineColor": "#e6e6e6",
                        "fillColor": "#f7f7f7"
                      },
                      "_$child": [
                        {
                          "_$id": "socx0005",
                          "_$type": "GTextField",
                          "name": "mName",
                          "x": 10,
                          "width": 300,
                          "height": 90,
                          "_mouseState": 1,
                          "text": "",
                          "font": "STZhongsong",
                          "fontSize": 36,
                          "color": "#191919",
                          "valign": "middle"
                        },
                        {
                          "_$id": "socx0006",
                          "_$type": "GTextField",
                          "name": "mDel",
                          "x": 330,
                          "y": 10,
                          "width": 100,
                          "height": 70,
                          "_mouseState": 2,
                          "background": {
                            "_$type": "DrawRoundRectCmd",
                            "lt": 8,
                            "rt": 8,
                            "lb": 8,
                            "rb": 8,
                            "lineWidth": 1,
                            "lineColor": "#fa5151",
                            "fillColor": "#ffffff"
                          },
                          "text": "删除",
                          "font": "STZhongsong",
                          "fontSize": 32,
                          "color": "#fa5151",
                          "align": "center",
                          "valign": "middle"
                        }
                      ]
                    }
                  ]
                },
                {
                  "_$id": "socx0009",
                  "_$type": "GTextField",
                  "name": "grpInfo",
                  "x": 10,
                  "y": 650,
                  "width": 440,
                  "height": 80,
                  "_mouseState": 1,
                  "text": "",
                  "font": "STZhongsong",
                  "fontSize": 30,
                  "color": "#999999",
                  "valign": "middle"
                },
                {
                  "_$id": "socx000a",
                  "_$type": "GTextField",
                  "name": "btnLeaveGroup",
                  "x": 10,
                  "y": 760,
                  "width": 440,
                  "height": 90,
                  "_mouseState": 2,
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 8,
                    "rt": 8,
                    "lb": 8,
                    "rb": 8,
                    "fillColor": "#fa5151"
                  },
                  "text": "退出群聊",
                  "font": "STZhongsong",
                  "fontSize": 36,
                  "color": "#ffffff",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                }
              ]
            },
            {
              "_$id": "cfp00003",
              "_$type": "GBox",
              "name": "chatFuncPanel",
              "y": 1620,
              "width": 1175,
              "height": 270,
              "visible": false,
              "background": {
                "_$type": "DrawRectCmd",
                "fillColor": "#ededed"
              },
              "_$child": [
                {
                  "_$id": "cfp00004",
                  "_$type": "GList",
                  "name": "funcList",
                  "x": 10,
                  "y": 5,
                  "width": 1155,
                  "height": 260,
                  "mouseThrough": true,
                  "layout": {
                    "type": 3,
                    "rows": 2
                  },
                  "scroller": {
                    "_$type": "Scroller",
                    "direction": 1,
                    "barDisplay": 3,
                    "barFloating": true
                  },
                  "_templateNode": {
                    "_$ref": "cfp00001",
                    "_$tmpl": "itemTemplate"
                  },
                  "_initItemNum": null,
                  "_$child": [
                    {
                      "_$id": "cfp00001",
                      "_$type": "GBox",
                      "name": "funcItem",
                      "width": 260,
                      "height": 130,
                      "background": {
                        "_$type": "DrawRectCmd",
                        "lineWidth": 1,
                        "lineColor": "#e0e0e0",
                        "fillColor": "#f7f7f7"
                      },
                      "_$child": [
                        {
                          "_$id": "cfp00002",
                          "_$type": "GTextField",
                          "name": "fLabel",
                          "width": 260,
                          "height": 130,
                          "_mouseState": 1,
                          "text": "",
                          "font": "STZhongsong",
                          "fontSize": 36,
                          "color": "#191919",
                          "align": "center",
                          "valign": "middle"
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "_$id": "cfp00007",
              "_$type": "GBox",
              "name": "fwdPanel",
              "width": 1175,
              "height": 2034,
              "visible": false,
              "background": {
                "_$type": "DrawRectCmd",
                "fillColor": "#ffffff"
              },
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "ng6b6usl"
                  },
                  "data": [
                    1,
                    0,
                    2,
                    0,
                    3,
                    0,
                    10,
                    0
                  ]
                }
              ],
              "_$child": [
                {
                  "_$id": "cfp00008",
                  "_$type": "GBox",
                  "name": "fwdTop",
                  "width": 1175,
                  "height": 140,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "fillColor": "#ededed"
                  },
                  "_$child": [
                    {
                      "_$id": "cfp00009",
                      "_$type": "GTextField",
                      "name": "fwdBack",
                      "x": 20,
                      "y": 20,
                      "width": 160,
                      "height": 100,
                      "_mouseState": 2,
                      "background": {
                        "_$type": "DrawRectCmd",
                        "lineWidth": 1,
                        "lineColor": "#d0d0d0",
                        "fillColor": "#ffffff"
                      },
                      "text": "‹ 返回",
                      "font": "STZhongsong",
                      "fontSize": 44,
                      "color": "#191919",
                      "bold": true,
                      "align": "center",
                      "valign": "middle"
                    },
                    {
                      "_$id": "cfp0000a",
                      "_$type": "GTextField",
                      "name": "fwdTitle",
                      "x": 200,
                      "width": 900,
                      "height": 140,
                      "_mouseState": 1,
                      "text": "转发到",
                      "font": "STZhongsong",
                      "fontSize": 56,
                      "color": "#191919",
                      "bold": true,
                      "valign": "middle"
                    }
                  ]
                },
                {
                  "_$id": "cfp0000b",
                  "_$type": "GList",
                  "name": "fwdList",
                  "y": 140,
                  "width": 1175,
                  "height": 1894,
                  "mouseThrough": true,
                  "layout": {
                    "type": 1
                  },
                  "scroller": {
                    "_$type": "Scroller",
                    "barDisplay": 3,
                    "barFloating": true
                  },
                  "_templateNode": {
                    "_$ref": "cfp00005",
                    "_$tmpl": "itemTemplate"
                  },
                  "_initItemNum": null,
                  "_$child": [
                    {
                      "_$id": "cfp00005",
                      "_$type": "GBox",
                      "name": "fwdItem",
                      "width": 1175,
                      "height": 120,
                      "background": {
                        "_$type": "DrawRectCmd",
                        "lineWidth": 1,
                        "lineColor": "#e6e6e6",
                        "fillColor": "#ffffff"
                      },
                      "_$child": [
                        {
                          "_$id": "cfp00006",
                          "_$type": "GTextField",
                          "name": "fwdName",
                          "x": 20,
                          "width": 1000,
                          "height": 120,
                          "_mouseState": 1,
                          "text": "",
                          "font": "STZhongsong",
                          "fontSize": 40,
                          "color": "#191919",
                          "valign": "middle"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "_$id": "soc0000n",
          "_$type": "GBox",
          "name": "socAdd",
          "width": 1175,
          "height": 2034,
          "visible": false,
          "relations": [
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                1,
                0
              ]
            },
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                2,
                0
              ]
            },
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                3,
                0
              ]
            },
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                10,
                0
              ]
            }
          ],
          "_$child": [
            {
              "_$id": "soc0000o",
              "_$type": "GBox",
              "name": "addTop",
              "width": 1175,
              "height": 140,
              "background": {
                "_$type": "DrawRectCmd",
                "fillColor": "#ededed"
              },
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000n"
                  },
                  "data": [
                    1,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000n"
                  },
                  "data": [
                    3,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000n"
                  },
                  "data": [
                    10,
                    0
                  ]
                }
              ],
              "_$child": [
                {
                  "_$id": "soc0000p",
                  "_$type": "GTextField",
                  "name": "addBack",
                  "x": 20,
                  "y": 20,
                  "width": 160,
                  "height": 100,
                  "_mouseState": 2,
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 8,
                    "rt": 8,
                    "lb": 8,
                    "rb": 8,
                    "fillColor": "#ffffff"
                  },
                  "text": "‹ 返回",
                  "font": "STZhongsong",
                  "fontSize": 44,
                  "color": "#191919",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                },
                {
                  "_$id": "soc0000q",
                  "_$type": "GTextField",
                  "name": "addTitle",
                  "x": 200,
                  "width": 900,
                  "height": 140,
                  "_mouseState": 1,
                  "text": "加好友",
                  "font": "STZhongsong",
                  "fontSize": 56,
                  "color": "#191919",
                  "bold": true,
                  "valign": "middle"
                }
              ]
            },
            {
              "_$id": "soc0000r",
              "_$type": "GTextInput",
              "name": "addInp",
              "x": 20,
              "y": 170,
              "width": 880,
              "height": 110,
              "background": {
                "_$type": "DrawRoundRectCmd",
                "lt": 8,
                "rt": 8,
                "lb": 8,
                "rb": 8,
                "lineWidth": 1,
                "lineColor": "#d0d0d0",
                "fillColor": "#ffffff"
              },
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000n"
                  },
                  "data": [
                    3,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000n"
                  },
                  "data": [
                    10,
                    0
                  ]
                }
              ],
              "text": "",
              "font": "STZhongsong",
              "fontSize": 44,
              "color": "#191919",
              "valign": "middle",
              "padding": [
                16,
                8,
                16,
                8
              ],
              "prompt": "输入用户ID",
              "promptColor": "#b2b2b2"
            },
            {
              "_$id": "soc0000s",
              "_$type": "GTextField",
              "name": "addSearch",
              "x": 920,
              "y": 170,
              "width": 235,
              "height": 110,
              "_mouseState": 2,
              "background": {
                "_$type": "DrawRoundRectCmd",
                "lt": 8,
                "rt": 8,
                "lb": 8,
                "rb": 8,
                "fillColor": "#07c160"
              },
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000n"
                  },
                  "data": [
                    9,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000n"
                  },
                  "data": [
                    10,
                    0
                  ]
                }
              ],
              "text": "搜索",
              "font": "STZhongsong",
              "fontSize": 44,
              "color": "#ffffff",
              "bold": true,
              "align": "center",
              "valign": "middle"
            },
            {
              "_$id": "soc0000t",
              "_$type": "GBox",
              "name": "addResult",
              "x": 20,
              "y": 410,
              "width": 1135,
              "height": 180,
              "visible": false,
              "background": {
                "_$type": "DrawRoundRectCmd",
                "lt": 8,
                "rt": 8,
                "lb": 8,
                "rb": 8,
                "lineWidth": 1,
                "lineColor": "#e0e0e0",
                "fillColor": "#ffffff"
              },
              "_$child": [
                {
                  "_$id": "soc0000u",
                  "_$type": "GImage",
                  "name": "rHead",
                  "x": 20,
                  "y": 30,
                  "width": 120,
                  "height": 120,
                  "_mouseState": 1,
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 8,
                    "rt": 8,
                    "lb": 8,
                    "rb": 8,
                    "fillColor": "#e0e0e0"
                  },
                  "src": ""
                },
                {
                  "_$id": "soc0000v",
                  "_$type": "GTextField",
                  "name": "rName",
                  "x": 170,
                  "y": 28,
                  "width": 600,
                  "height": 64,
                  "_mouseState": 1,
                  "text": "",
                  "font": "STZhongsong",
                  "fontSize": 48,
                  "color": "#191919",
                  "valign": "middle"
                },
                {
                  "_$id": "soc0000w",
                  "_$type": "GTextField",
                  "name": "rSub",
                  "x": 170,
                  "y": 100,
                  "width": 600,
                  "height": 56,
                  "_mouseState": 1,
                  "text": "",
                  "font": "STZhongsong",
                  "fontSize": 36,
                  "color": "#999999",
                  "valign": "middle"
                },
                {
                  "_$id": "soc0000x",
                  "_$type": "GTextField",
                  "name": "rReq",
                  "x": 900,
                  "y": 40,
                  "width": 215,
                  "height": 100,
                  "_mouseState": 2,
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 8,
                    "rt": 8,
                    "lb": 8,
                    "rb": 8,
                    "fillColor": "#07c160"
                  },
                  "text": "发申请",
                  "font": "STZhongsong",
                  "fontSize": 44,
                  "color": "#ffffff",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                }
              ]
            },
            {
              "_$id": "soc0000y",
              "_$type": "GTextField",
              "name": "reqTitle",
              "x": 20,
              "y": 620,
              "width": 600,
              "height": 64,
              "_mouseState": 1,
              "text": "新的朋友",
              "font": "STZhongsong",
              "fontSize": 44,
              "color": "#191919",
              "bold": true,
              "valign": "middle"
            },
            {
              "_$id": "soc00015",
              "_$type": "GList",
              "name": "reqList",
              "y": 700,
              "width": 1175,
              "height": 1334,
              "mouseThrough": true,
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000n"
                  },
                  "data": [
                    1,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000n"
                  },
                  "data": [
                    3,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000y"
                  },
                  "data": [
                    12,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "soc0000n"
                  },
                  "data": [
                    24,
                    0
                  ]
                }
              ],
              "layout": {
                "type": 1
              },
              "scroller": {
                "_$type": "Scroller",
                "barDisplay": 3,
                "barFloating": true
              },
              "_templateNode": {
                "_$ref": "soc0000z",
                "_$tmpl": "itemTemplate"
              },
              "_initItemNum": null,
              "_$child": [
                {
                  "_$id": "soc0000z",
                  "_$type": "GBox",
                  "name": "reqItem",
                  "width": 1175,
                  "height": 150,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "lineWidth": 1,
                    "lineColor": "#e6e6e6",
                    "fillColor": "#ffffff"
                  },
                  "_$child": [
                    {
                      "_$id": "soc00010",
                      "_$type": "GImage",
                      "name": "qHead",
                      "x": 30,
                      "y": 15,
                      "width": 120,
                      "height": 120,
                      "_mouseState": 1,
                      "background": {
                        "_$type": "DrawRoundRectCmd",
                        "lt": 8,
                        "rt": 8,
                        "lb": 8,
                        "rb": 8,
                        "fillColor": "#e0e0e0"
                      },
                      "src": "",
                      "autoSize": false
                    },
                    {
                      "_$id": "soc00011",
                      "_$type": "GTextField",
                      "name": "qName",
                      "x": 180,
                      "y": 20,
                      "width": 560,
                      "height": 60,
                      "_mouseState": 1,
                      "text": "",
                      "font": "STZhongsong",
                      "fontSize": 44,
                      "color": "#191919",
                      "valign": "middle"
                    },
                    {
                      "_$id": "soc00012",
                      "_$type": "GTextField",
                      "name": "qSub",
                      "x": 180,
                      "y": 84,
                      "width": 560,
                      "height": 50,
                      "_mouseState": 1,
                      "text": "请求加为好友",
                      "font": "STZhongsong",
                      "fontSize": 32,
                      "color": "#999999",
                      "valign": "middle"
                    },
                    {
                      "_$id": "soc00013",
                      "_$type": "GTextField",
                      "name": "qOk",
                      "x": 880,
                      "y": 30,
                      "width": 130,
                      "height": 90,
                      "_mouseState": 2,
                      "background": {
                        "_$type": "DrawRoundRectCmd",
                        "lt": 8,
                        "rt": 8,
                        "lb": 8,
                        "rb": 8,
                        "fillColor": "#07c160"
                      },
                      "text": "同意",
                      "font": "STZhongsong",
                      "fontSize": 40,
                      "color": "#ffffff",
                      "bold": true,
                      "align": "center",
                      "valign": "middle"
                    },
                    {
                      "_$id": "soc00014",
                      "_$type": "GTextField",
                      "name": "qNo",
                      "x": 1025,
                      "y": 30,
                      "width": 130,
                      "height": 90,
                      "_mouseState": 2,
                      "background": {
                        "_$type": "DrawRoundRectCmd",
                        "lt": 8,
                        "rt": 8,
                        "lb": 8,
                        "rb": 8,
                        "fillColor": "#e8e8e8"
                      },
                      "text": "拒绝",
                      "font": "STZhongsong",
                      "fontSize": 40,
                      "color": "#191919",
                      "bold": true,
                      "align": "center",
                      "valign": "middle"
                    }
                  ]
                }
              ]
            },
            {
              "_$id": "soc00016",
              "_$type": "GTextField",
              "name": "reqEmpty",
              "y": 800,
              "width": 1175,
              "height": 120,
              "visible": false,
              "_mouseState": 1,
              "text": "暂无好友申请",
              "font": "STZhongsong",
              "fontSize": 40,
              "color": "#b2b2b2",
              "align": "center",
              "valign": "middle"
            },
            {
              "_$id": "sox00003",
              "_$type": "GTextField",
              "name": "priceLabel",
              "x": 20,
              "y": 300,
              "width": 160,
              "height": 90,
              "_mouseState": 1,
              "text": "身价",
              "font": "STZhongsong",
              "fontSize": 40,
              "color": "#191919",
              "bold": true,
              "valign": "middle"
            },
            {
              "_$id": "sox00004",
              "_$type": "GTextInput",
              "name": "addPrice",
              "x": 180,
              "y": 300,
              "width": 200,
              "height": 90,
              "background": {
                "_$type": "DrawRoundRectCmd",
                "lt": 8,
                "rt": 8,
                "lb": 8,
                "rb": 8,
                "lineWidth": 1,
                "lineColor": "#d0d0d0",
                "fillColor": "#fff"
              },
              "text": "",
              "font": "STZhongsong",
              "fontSize": 44,
              "color": "#191919",
              "valign": "middle",
              "padding": [
                16,
                8,
                16,
                8
              ],
              "prompt": "1",
              "promptColor": "#b2b2b2"
            },
            {
              "_$id": "sox00005",
              "_$type": "GTextField",
              "name": "priceHint",
              "x": 400,
              "y": 300,
              "width": 740,
              "height": 90,
              "_mouseState": 1,
              "text": "金币(0-500, 默认1)",
              "font": "STZhongsong",
              "fontSize": 32,
              "color": "#999",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "sox00006",
          "_$type": "GBox",
          "name": "socGroup",
          "width": 1175,
          "height": 2034,
          "visible": false,
          "relations": [
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                1,
                0
              ]
            },
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                2,
                0
              ]
            },
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                3,
                0
              ]
            },
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                10,
                0
              ]
            }
          ],
          "_$child": [
            {
              "_$id": "sox00007",
              "_$type": "GBox",
              "name": "gTop",
              "width": 1175,
              "height": 140,
              "background": {
                "_$type": "DrawRectCmd",
                "fillColor": "#ededed"
              },
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "sox00006"
                  },
                  "data": [
                    1,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "sox00006"
                  },
                  "data": [
                    3,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "sox00006"
                  },
                  "data": [
                    10,
                    0
                  ]
                }
              ],
              "_$child": [
                {
                  "_$id": "sox00008",
                  "_$type": "GTextField",
                  "name": "gBack",
                  "x": 20,
                  "y": 20,
                  "width": 160,
                  "height": 100,
                  "_mouseState": 2,
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 8,
                    "rt": 8,
                    "lb": 8,
                    "rb": 8,
                    "fillColor": "#fff"
                  },
                  "text": "‹ 返回",
                  "font": "STZhongsong",
                  "fontSize": 44,
                  "color": "#191919",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                },
                {
                  "_$id": "sox00009",
                  "_$type": "GTextField",
                  "name": "gTitle",
                  "x": 200,
                  "width": 488,
                  "height": 140,
                  "_mouseState": 1,
                  "text": "创建群聊",
                  "font": "STZhongsong",
                  "fontSize": 56,
                  "color": "#191919",
                  "bold": true,
                  "valign": "middle"
                },
                {
                  "_$id": "sox0000h",
                  "_$type": "GTextField",
                  "name": "gCreate",
                  "x": 728,
                  "y": 16,
                  "width": 411,
                  "height": 110,
                  "_mouseState": 2,
                  "background": {
                    "_$type": "DrawRoundRectCmd",
                    "lt": 8,
                    "rt": 8,
                    "lb": 8,
                    "rb": 8,
                    "fillColor": "#a3caca"
                  },
                  "text": "创建群聊",
                  "font": "STZhongsong",
                  "fontSize": 48,
                  "color": "#fff",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                }
              ]
            },
            {
              "_$id": "sox0000a",
              "_$type": "GTextInput",
              "name": "gName",
              "x": 20,
              "y": 170,
              "width": 1135,
              "height": 100,
              "background": {
                "_$type": "DrawRoundRectCmd",
                "lt": 8,
                "rt": 8,
                "lb": 8,
                "rb": 8,
                "lineWidth": 1,
                "lineColor": "#d0d0d0",
                "fillColor": "#fff"
              },
              "text": "",
              "font": "STZhongsong",
              "fontSize": 44,
              "color": "#191919",
              "valign": "middle",
              "padding": [
                16,
                8,
                16,
                8
              ],
              "prompt": "群名称(1-20字)",
              "promptColor": "#b2b2b2"
            },
            {
              "_$id": "sox0000b",
              "_$type": "GTextField",
              "name": "gMemTitle",
              "x": 20,
              "y": 300,
              "width": 600,
              "height": 60,
              "_mouseState": 1,
              "text": "选择好友(至少1人)",
              "font": "STZhongsong",
              "fontSize": 40,
              "color": "#191919",
              "bold": true,
              "valign": "middle"
            },
            {
              "_$id": "sox0000g",
              "_$type": "GList",
              "name": "gMemList",
              "y": 380,
              "width": 1175,
              "height": 1400,
              "mouseThrough": true,
              "layout": {
                "type": 1
              },
              "scroller": {
                "_$type": "Scroller",
                "barDisplay": 3,
                "barFloating": true
              },
              "_templateNode": {
                "_$ref": "sox0000c",
                "_$tmpl": "itemTemplate"
              },
              "_initItemNum": null,
              "_$child": [
                {
                  "_$id": "sox0000c",
                  "_$type": "GBox",
                  "name": "gMemItem",
                  "width": 1175,
                  "height": 120,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "lineWidth": 1,
                    "lineColor": "#e6e6e6",
                    "fillColor": "#fff"
                  },
                  "_$child": [
                    {
                      "_$id": "sox0000d",
                      "_$type": "GImage",
                      "name": "mHead",
                      "x": 20,
                      "y": 10,
                      "width": 100,
                      "height": 100,
                      "_mouseState": 1,
                      "background": {
                        "_$type": "DrawRoundRectCmd",
                        "lt": 8,
                        "rt": 8,
                        "lb": 8,
                        "rb": 8,
                        "fillColor": "#e0e0e0"
                      },
                      "src": ""
                    },
                    {
                      "_$id": "sox0000e",
                      "_$type": "GTextField",
                      "name": "mName",
                      "x": 140,
                      "y": 10,
                      "width": 700,
                      "height": 100,
                      "_mouseState": 1,
                      "text": "",
                      "font": "STZhongsong",
                      "fontSize": 44,
                      "color": "#191919",
                      "valign": "middle"
                    },
                    {
                      "_$id": "sox0000f",
                      "_$type": "GTextField",
                      "name": "mToggle",
                      "x": 1000,
                      "y": 20,
                      "width": 150,
                      "height": 80,
                      "_mouseState": 2,
                      "background": {
                        "_$type": "DrawRoundRectCmd",
                        "lt": 8,
                        "rt": 8,
                        "lb": 8,
                        "rb": 8,
                        "fillColor": "#e8e8e8"
                      },
                      "text": "选",
                      "font": "STZhongsong",
                      "fontSize": 40,
                      "color": "#191919",
                      "bold": true,
                      "align": "center",
                      "valign": "middle"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "_$id": "ncx00000",
          "_$type": "GBox",
          "name": "socNewChat",
          "width": 1175,
          "height": 2034,
          "visible": false,
          "relations": [
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "ng6b6usl"
              },
              "data": [
                1,
                0,
                2,
                0,
                3,
                0,
                10,
                0
              ]
            }
          ],
          "_$child": [
            {
              "_$id": "ncx00001",
              "_$type": "GBox",
              "name": "ncTop",
              "width": 1175,
              "height": 140,
              "background": {
                "_$type": "DrawRectCmd",
                "fillColor": "#ededed"
              },
              "_$child": [
                {
                  "_$id": "ncx00002",
                  "_$type": "GTextField",
                  "name": "ncBack",
                  "x": 20,
                  "y": 20,
                  "width": 160,
                  "height": 100,
                  "_mouseState": 2,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "lineWidth": 1,
                    "lineColor": "#d0d0d0",
                    "fillColor": "#ffffff"
                  },
                  "text": "‹ 返回",
                  "font": "STZhongsong",
                  "fontSize": 44,
                  "color": "#191919",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                },
                {
                  "_$id": "ncx00003",
                  "_$type": "GTextField",
                  "name": "ncTitle",
                  "x": 200,
                  "width": 900,
                  "height": 140,
                  "_mouseState": 1,
                  "text": "创建新聊天(选好友)",
                  "font": "STZhongsong",
                  "fontSize": 56,
                  "color": "#191919",
                  "bold": true,
                  "valign": "middle"
                }
              ]
            },
            {
              "_$id": "ncx00007",
              "_$type": "GList",
              "name": "ncList",
              "y": 140,
              "width": 1175,
              "height": 1894,
              "mouseThrough": true,
              "layout": {
                "type": 1
              },
              "scroller": {
                "_$type": "Scroller",
                "barDisplay": 3,
                "barFloating": true
              },
              "_templateNode": {
                "_$ref": "ncx00004",
                "_$tmpl": "itemTemplate"
              },
              "_initItemNum": null,
              "_$child": [
                {
                  "_$id": "ncx00004",
                  "_$type": "GBox",
                  "name": "ncItem",
                  "width": 1175,
                  "height": 130,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "lineWidth": 1,
                    "lineColor": "#e6e6e6",
                    "fillColor": "#ffffff"
                  },
                  "_$child": [
                    {
                      "_$id": "ncx00005",
                      "_$type": "GImage",
                      "name": "ncHead",
                      "x": 20,
                      "y": 15,
                      "width": 100,
                      "height": 100,
                      "_mouseState": 1,
                      "background": {
                        "_$type": "DrawRectCmd",
                        "fillColor": "#e0e0e0"
                      },
                      "src": ""
                    },
                    {
                      "_$id": "ncx00006",
                      "_$type": "GTextField",
                      "name": "ncName",
                      "x": 140,
                      "width": 900,
                      "height": 130,
                      "_mouseState": 1,
                      "text": "",
                      "font": "STZhongsong",
                      "fontSize": 44,
                      "color": "#191919",
                      "valign": "middle"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "_$id": "8dcxrzg6",
      "_$type": "GBox",
      "name": "item3",
      "y": 188,
      "width": 1175,
      "height": 2042,
      "_mouseState": 2,
      "mouseThrough": true,
      "zIndex": 1,
      "gears": [
        {
          "_$type": "GearDisplay",
          "controller": {
            "_$ref": "yfk534ud",
            "_$ctrl": "c0"
          },
          "pages": [
            3
          ],
          "condition": 1
        }
      ],
      "relations": [
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "xyewy7mo"
          },
          "data": [
            1,
            0,
            12,
            0
          ]
        },
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "qelj0un4"
          },
          "data": [
            23,
            0
          ]
        }
      ],
      "_$child": [
        {
          "_$id": "5rnceryk",
          "_$type": "GBox",
          "name": "gbox",
          "x": 106,
          "y": 110,
          "width": 963,
          "height": 466,
          "relations": [
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "8dcxrzg6"
              },
              "data": [
                6,
                0,
                12,
                1
              ]
            }
          ],
          "_$child": [
            {
              "_$id": "fgguzn12",
              "_$type": "GTextInput",
              "name": "name",
              "x": 448,
              "y": 18,
              "width": 435,
              "height": 112,
              "text": "昵称",
              "font": "STXinwei",
              "fontSize": 60,
              "valign": "middle",
              "stroke": 1
            },
            {
              "_$id": "6g07zt7i",
              "_$type": "GImage",
              "name": "head",
              "x": -20,
              "y": -16,
              "width": 285,
              "height": 285,
              "scaleX": 1.5,
              "scaleY": 1.5,
              "zIndex": 5,
              "src": ""
            },
            {
              "_$id": "1monet7t",
              "_$type": "GTextInput",
              "name": "flag",
              "x": 448,
              "y": 171,
              "width": 513,
              "height": 240,
              "text": "签名",
              "font": "STXinwei",
              "fontSize": 60,
              "valign": "top",
              "maxChars": 20,
              "multiline": true
            }
          ]
        },
        {
          "_$id": "9vq6pfhg",
          "_$type": "GBox",
          "name": "listbox",
          "x": 28,
          "y": 588,
          "width": 1104,
          "height": 1436,
          "relations": [
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "5rnceryk"
              },
              "data": [
                12,
                0,
                24,
                0
              ]
            },
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "2wk6ott4"
              },
              "data": [
                1,
                0,
                6,
                0,
                24,
                0
              ]
            }
          ],
          "_$child": [
            {
              "_$id": "ptr00000",
              "_$type": "GButton",
              "name": "tabBag",
              "width": 220,
              "height": 130,
              "_mouseState": 2,
              "controllers": {
                "_$type": "Record",
                "button": {
                  "_$type": "Controller",
                  "pages": [
                    "up",
                    "down",
                    "over",
                    "selectedOver",
                    "disabled",
                    "selectedDisabled"
                  ],
                  "_editingIndex": 1
                }
              },
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "9vq6pfhg"
                  },
                  "data": [
                    3,
                    0
                  ]
                }
              ],
              "title": "背包",
              "selectedTitle": "背包",
              "mode": 2,
              "selected": true,
              "_$child": [
                {
                  "_$id": "ptr00001",
                  "_$type": "GBox",
                  "name": "bgNormal",
                  "width": 220,
                  "height": 130,
                  "_mouseState": 1,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "lineWidth": 1,
                    "lineColor": "#e0e0e0",
                    "fillColor": "#f2f2f2"
                  },
                  "gears": [
                    {
                      "_$type": "GearDisplay",
                      "controller": {
                        "_$ref": "ptr00000",
                        "_$ctrl": "button"
                      },
                      "pages": [
                        0,
                        2,
                        4
                      ]
                    }
                  ]
                },
                {
                  "_$id": "ptr00002",
                  "_$type": "GBox",
                  "name": "bgSel",
                  "width": 220,
                  "height": 130,
                  "_mouseState": 1,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "lineWidth": 1,
                    "lineColor": "#e0e0e0",
                    "fillColor": "#07c160"
                  },
                  "gears": [
                    {
                      "_$type": "GearDisplay",
                      "controller": {
                        "_$ref": "ptr00000",
                        "_$ctrl": "button"
                      },
                      "pages": [
                        1,
                        3,
                        5
                      ]
                    }
                  ]
                },
                {
                  "_$id": "ptr00003",
                  "_$type": "GTextField",
                  "name": "t",
                  "width": 220,
                  "height": 130,
                  "_mouseState": 1,
                  "text": "背包",
                  "font": "STZhongsong",
                  "fontSize": 44,
                  "color": "#191919",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                }
              ]
            },
            {
              "_$id": "ptr00004",
              "_$type": "GButton",
              "name": "tabRec",
              "y": 130,
              "width": 220,
              "height": 130,
              "_mouseState": 2,
              "controllers": {
                "_$type": "Record",
                "button": {
                  "_$type": "Controller",
                  "pages": [
                    "up",
                    "down",
                    "over",
                    "selectedOver",
                    "disabled",
                    "selectedDisabled"
                  ]
                }
              },
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "9vq6pfhg"
                  },
                  "data": [
                    3,
                    0
                  ]
                }
              ],
              "title": "战绩",
              "selectedTitle": "战绩",
              "mode": 2,
              "_$child": [
                {
                  "_$id": "ptr00005",
                  "_$type": "GBox",
                  "name": "bgNormal",
                  "width": 220,
                  "height": 130,
                  "_mouseState": 1,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "lineWidth": 1,
                    "lineColor": "#e0e0e0",
                    "fillColor": "#f2f2f2"
                  },
                  "gears": [
                    {
                      "_$type": "GearDisplay",
                      "controller": {
                        "_$ref": "ptr00004",
                        "_$ctrl": "button"
                      },
                      "pages": [
                        0,
                        2,
                        4
                      ]
                    }
                  ]
                },
                {
                  "_$id": "ptr00006",
                  "_$type": "GBox",
                  "name": "bgSel",
                  "width": 220,
                  "height": 130,
                  "_mouseState": 1,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "lineWidth": 1,
                    "lineColor": "#e0e0e0",
                    "fillColor": "#07c160"
                  },
                  "gears": [
                    {
                      "_$type": "GearDisplay",
                      "controller": {
                        "_$ref": "ptr00004",
                        "_$ctrl": "button"
                      },
                      "pages": [
                        1,
                        3,
                        5
                      ]
                    }
                  ]
                },
                {
                  "_$id": "ptr00007",
                  "_$type": "GTextField",
                  "name": "t",
                  "width": 220,
                  "height": 130,
                  "_mouseState": 1,
                  "text": "战绩",
                  "font": "STZhongsong",
                  "fontSize": 44,
                  "color": "#191919",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                }
              ]
            },
            {
              "_$id": "sox0000l",
              "_$type": "GBox",
              "name": "pRight",
              "x": 220,
              "width": 900,
              "height": 1436,
              "background": {
                "_$type": "DrawRectCmd",
                "lineWidth": 1,
                "lineColor": "#000000"
              },
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "ptr00000"
                  },
                  "data": [
                    5,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "9vq6pfhg"
                  },
                  "data": [
                    20,
                    1
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "9vq6pfhg"
                  },
                  "data": [
                    10,
                    0
                  ]
                },
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "9vq6pfhg"
                  },
                  "data": [
                    24,
                    0
                  ]
                }
              ],
              "_$child": [
                {
                  "_$id": "sox0000m",
                  "_$type": "GBox",
                  "name": "pBag",
                  "x": -40,
                  "width": 951,
                  "height": 1462,
                  "relations": [
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "sox0000l"
                      },
                      "data": [
                        1,
                        0
                      ]
                    },
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "sox0000l"
                      },
                      "data": [
                        2,
                        0
                      ]
                    },
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "sox0000l"
                      },
                      "data": [
                        3,
                        0
                      ]
                    },
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "sox0000l"
                      },
                      "data": [
                        10,
                        0
                      ]
                    }
                  ],
                  "_$child": [
                    {
                      "_$id": "sox0000r",
                      "_$type": "GList",
                      "name": "bagTable",
                      "x": 46,
                      "width": 915,
                      "height": 1438,
                      "mouseThrough": true,
                      "relations": [
                        {
                          "_$type": "Relation",
                          "target": {
                            "_$ref": "sox0000m"
                          },
                          "data": [
                            1,
                            0,
                            2,
                            0,
                            3,
                            0,
                            13,
                            0
                          ]
                        }
                      ],
                      "layout": {
                        "type": 4,
                        "columns": 3
                      },
                      "scroller": {
                        "_$type": "Scroller",
                        "barDisplay": 3,
                        "barFloating": true
                      },
                      "_templateNode": {
                        "_$ref": "sox0000n",
                        "_$tmpl": "itemTemplate"
                      },
                      "_initItemNum": null,
                      "_$child": [
                        {
                          "_$id": "sox0000n",
                          "_$type": "GBox",
                          "name": "bagRow",
                          "width": 294,
                          "height": 287,
                          "background": {
                            "_$type": "DrawRectCmd",
                            "lineWidth": 1,
                            "lineColor": "#e6e6e6",
                            "fillColor": "#fff"
                          },
                          "_$child": [
                            {
                              "_$id": "sox0000o",
                              "_$type": "GImage",
                              "name": "img",
                              "x": 67,
                              "y": 20,
                              "width": 160,
                              "height": 160,
                              "_mouseState": 1,
                              "background": {
                                "_$type": "DrawRoundRectCmd",
                                "lt": 8,
                                "rt": 8,
                                "lb": 8,
                                "rb": 8,
                                "fillColor": "#e0e0e0"
                              },
                              "src": ""
                            },
                            {
                              "_$id": "sox0000q",
                              "_$type": "GTextField",
                              "name": "count",
                              "y": 190,
                              "width": 294,
                              "height": 70,
                              "_mouseState": 1,
                              "text": "x1",
                              "font": "STZhongsong",
                              "fontSize": 44,
                              "color": "#07c160",
                              "bold": true,
                              "align": "center",
                              "valign": "middle"
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "_$id": "sox0000s",
                  "_$type": "GBox",
                  "name": "pRec",
                  "width": 907,
                  "height": 1462,
                  "visible": false,
                  "relations": [
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "sox0000l"
                      },
                      "data": [
                        1,
                        0
                      ]
                    },
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "sox0000l"
                      },
                      "data": [
                        2,
                        0
                      ]
                    },
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "sox0000l"
                      },
                      "data": [
                        3,
                        0
                      ]
                    },
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "sox0000l"
                      },
                      "data": [
                        10,
                        0
                      ]
                    }
                  ],
                  "_$child": [
                    {
                      "_$id": "sox0000y",
                      "_$type": "GList",
                      "name": "recList",
                      "width": 915,
                      "height": 1426,
                      "mouseThrough": true,
                      "relations": [
                        {
                          "_$type": "Relation",
                          "target": {
                            "_$ref": "sox0000s"
                          },
                          "data": [
                            1,
                            0,
                            3,
                            0,
                            10,
                            0
                          ]
                        }
                      ],
                      "layout": {
                        "type": 1
                      },
                      "scroller": {
                        "_$type": "Scroller",
                        "barDisplay": 3,
                        "barFloating": true
                      },
                      "_templateNode": {
                        "_$ref": "sox0000t",
                        "_$tmpl": "itemTemplate"
                      },
                      "_initItemNum": null,
                      "_$child": [
                        {
                          "_$id": "sox0000t",
                          "_$type": "GBox",
                          "name": "recRow",
                          "width": 935,
                          "height": 130,
                          "background": {
                            "_$type": "DrawRectCmd",
                            "lineWidth": 1,
                            "lineColor": "#e6e6e6",
                            "fillColor": "#fff"
                          },
                          "_$child": [
                            {
                              "_$id": "sox0000u",
                              "_$type": "GTextField",
                              "name": "rMode",
                              "x": 20,
                              "y": 10,
                              "width": 160,
                              "height": 110,
                              "_mouseState": 1,
                              "text": "PVE",
                              "font": "STZhongsong",
                              "fontSize": 36,
                              "color": "#999",
                              "align": "center",
                              "valign": "middle"
                            },
                            {
                              "_$id": "sox0000v",
                              "_$type": "GTextField",
                              "name": "rWin",
                              "x": 190,
                              "y": 10,
                              "width": 120,
                              "height": 110,
                              "_mouseState": 1,
                              "text": "胜",
                              "font": "STZhongsong",
                              "fontSize": 44,
                              "color": "#07c160",
                              "bold": true,
                              "align": "center",
                              "valign": "middle"
                            },
                            {
                              "_$id": "sox0000w",
                              "_$type": "GTextField",
                              "name": "rScore",
                              "x": 320,
                              "y": 10,
                              "width": 260,
                              "height": 110,
                              "_mouseState": 1,
                              "text": "0:0",
                              "font": "STZhongsong",
                              "fontSize": 40,
                              "color": "#191919",
                              "align": "center",
                              "valign": "middle"
                            },
                            {
                              "_$id": "sox0000x",
                              "_$type": "GTextField",
                              "name": "rTime",
                              "x": 600,
                              "y": 10,
                              "width": 315,
                              "height": 110,
                              "_mouseState": 1,
                              "text": "",
                              "font": "STZhongsong",
                              "fontSize": 32,
                              "color": "#b2b2b2",
                              "align": "right",
                              "valign": "middle"
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "_$id": "sox0000z",
                      "_$type": "GTextField",
                      "name": "recEmpty",
                      "y": 600,
                      "width": 935,
                      "height": 120,
                      "visible": false,
                      "_mouseState": 1,
                      "text": "暂无对局记录",
                      "font": "STZhongsong",
                      "fontSize": 40,
                      "color": "#b2b2b2",
                      "align": "center",
                      "valign": "middle"
                    }
                  ]
                },
                {
                  "_$id": "sox00010",
                  "_$type": "GBox",
                  "name": "pDetail",
                  "width": 915,
                  "height": 1462,
                  "visible": false,
                  "relations": [
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "sox0000l"
                      },
                      "data": [
                        1,
                        0
                      ]
                    },
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "sox0000l"
                      },
                      "data": [
                        2,
                        0
                      ]
                    },
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "sox0000l"
                      },
                      "data": [
                        3,
                        0
                      ]
                    },
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "sox0000l"
                      },
                      "data": [
                        10,
                        0
                      ]
                    }
                  ],
                  "_$child": [
                    {
                      "_$id": "sox00011",
                      "_$type": "GTextField",
                      "name": "dBack",
                      "width": 160,
                      "height": 90,
                      "_mouseState": 2,
                      "background": {
                        "_$type": "DrawRoundRectCmd",
                        "lt": 8,
                        "rt": 8,
                        "lb": 8,
                        "rb": 8,
                        "fillColor": "#e8e8e8"
                      },
                      "text": "‹ 返回",
                      "font": "STZhongsong",
                      "fontSize": 40,
                      "color": "#191919",
                      "bold": true,
                      "align": "center",
                      "valign": "middle"
                    },
                    {
                      "_$id": "sox00012",
                      "_$type": "GTextField",
                      "name": "dTitle",
                      "x": 180,
                      "width": 439,
                      "height": 90,
                      "_mouseState": 1,
                      "text": "对局详情",
                      "font": "STZhongsong",
                      "fontSize": 44,
                      "color": "#191919",
                      "bold": true,
                      "valign": "middle"
                    },
                    {
                      "_$id": "sox00013",
                      "_$type": "GTextField",
                      "name": "dScore",
                      "y": 100,
                      "width": 847,
                      "height": 90,
                      "_mouseState": 1,
                      "text": "",
                      "font": "STZhongsong",
                      "fontSize": 40,
                      "color": "#191919",
                      "align": "center",
                      "valign": "middle"
                    },
                    {
                      "_$id": "sox00019",
                      "_$type": "GList",
                      "name": "dPlayers",
                      "y": 210,
                      "width": 895,
                      "height": 1228,
                      "mouseThrough": true,
                      "relations": [
                        {
                          "_$type": "Relation",
                          "target": {
                            "_$ref": "sox00010"
                          },
                          "data": [
                            1,
                            0,
                            3,
                            0
                          ]
                        },
                        {
                          "_$type": "Relation",
                          "target": {
                            "_$ref": "sox00010"
                          },
                          "data": [
                            24,
                            0
                          ]
                        }
                      ],
                      "layout": {
                        "type": 1
                      },
                      "scroller": {
                        "_$type": "Scroller",
                        "barDisplay": 3,
                        "barFloating": true
                      },
                      "_templateNode": {
                        "_$ref": "sox00014",
                        "_$tmpl": "itemTemplate"
                      },
                      "_initItemNum": null,
                      "_$child": [
                        {
                          "_$id": "sox00014",
                          "_$type": "GBox",
                          "name": "dRow",
                          "width": 935,
                          "height": 120,
                          "background": {
                            "_$type": "DrawRectCmd",
                            "lineWidth": 1,
                            "lineColor": "#e6e6e6",
                            "fillColor": "#fff"
                          },
                          "_$child": [
                            {
                              "_$id": "sox00015",
                              "_$type": "GImage",
                              "name": "pHead",
                              "x": 20,
                              "y": 10,
                              "width": 100,
                              "height": 100,
                              "_mouseState": 1,
                              "background": {
                                "_$type": "DrawRoundRectCmd",
                                "lt": 8,
                                "rt": 8,
                                "lb": 8,
                                "rb": 8,
                                "fillColor": "#e0e0e0"
                              },
                              "src": ""
                            },
                            {
                              "_$id": "sox00016",
                              "_$type": "GTextField",
                              "name": "pName",
                              "x": 140,
                              "y": 10,
                              "width": 560,
                              "height": 100,
                              "_mouseState": 1,
                              "text": "",
                              "font": "STZhongsong",
                              "fontSize": 40,
                              "color": "#191919",
                              "valign": "middle"
                            },
                            {
                              "_$id": "sox00017",
                              "_$type": "GTextField",
                              "name": "pSide",
                              "x": 700,
                              "y": 10,
                              "width": 110,
                              "height": 100,
                              "_mouseState": 1,
                              "text": "",
                              "font": "STZhongsong",
                              "fontSize": 36,
                              "color": "#999",
                              "align": "center",
                              "valign": "middle"
                            },
                            {
                              "_$id": "sox00018",
                              "_$type": "GTextField",
                              "name": "pAdd",
                              "x": 820,
                              "y": 20,
                              "width": 100,
                              "height": 80,
                              "_mouseState": 2,
                              "background": {
                                "_$type": "DrawRoundRectCmd",
                                "lt": 8,
                                "rt": 8,
                                "lb": 8,
                                "rb": 8,
                                "fillColor": "#07c160"
                              },
                              "text": "+",
                              "font": "STZhongsong",
                              "fontSize": 48,
                              "color": "#fff",
                              "bold": true,
                              "align": "center",
                              "valign": "middle"
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "_$id": "pts0000a",
                  "_$type": "GPanel",
                  "name": "pSet",
                  "width": 900,
                  "height": 1436,
                  "visible": false,
                  "relations": [
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "sox0000l"
                      },
                      "data": [
                        1,
                        0,
                        2,
                        0,
                        3,
                        0,
                        10,
                        0
                      ]
                    }
                  ],
                  "scroller": {
                    "_$type": "Scroller",
                    "barDisplay": 3,
                    "barFloating": true
                  },
                  "_$child": [
                    {
                      "_$id": "crbc0suw",
                      "_$prefab": "c008a142-015d-42f3-abf0-bca3b44b3c12",
                      "name": "au",
                      "active": true,
                      "x": 40,
                      "y": 20,
                      "width": 212,
                      "height": 92,
                      "scaleX": 2,
                      "scaleY": 2,
                      "visible": true,
                      "title": "音乐已关闭",
                      "selectedTitle": "音乐",
                      "selected": true
                    },
                    {
                      "_$id": "1k83rjh0",
                      "_$prefab": "c008a142-015d-42f3-abf0-bca3b44b3c12",
                      "name": "aue",
                      "active": true,
                      "x": 40,
                      "y": 220,
                      "width": 260,
                      "height": 97,
                      "scaleX": 2,
                      "scaleY": 2,
                      "visible": true,
                      "title": "音效已关闭",
                      "selectedTitle": "音效",
                      "selected": true
                    },
                    {
                      "_$id": "62qiee9i",
                      "_$prefab": "c008a142-015d-42f3-abf0-bca3b44b3c12",
                      "name": "show",
                      "active": true,
                      "x": 40,
                      "y": 420,
                      "width": 240,
                      "height": 75,
                      "scaleX": 2,
                      "scaleY": 2,
                      "visible": true,
                      "title": "已关闭操作区域辅助",
                      "selectedTitle": "显示游戏操作区域辅助",
                      "selected": true
                    },
                    {
                      "_$id": "yz6uf8q2",
                      "_$prefab": "c008a142-015d-42f3-abf0-bca3b44b3c12",
                      "name": "double",
                      "active": true,
                      "x": 40,
                      "y": 620,
                      "width": 234,
                      "height": 93,
                      "scaleX": 2,
                      "scaleY": 2,
                      "visible": true,
                      "title": "已关闭双手模式",
                      "selectedTitle": "开启游戏双手模式"
                    }
                  ]
                },
                {
                  "_$id": "pts0000b",
                  "_$type": "GBox",
                  "name": "pPrivacy",
                  "width": 900,
                  "height": 1436,
                  "visible": false,
                  "relations": [
                    {
                      "_$type": "Relation",
                      "target": {
                        "_$ref": "sox0000l"
                      },
                      "data": [
                        1,
                        0,
                        2,
                        0,
                        3,
                        0,
                        10,
                        0
                      ]
                    }
                  ],
                  "_$child": [
                    {
                      "_$id": "pts0000c",
                      "_$type": "GTextField",
                      "name": "priceLabel",
                      "x": 20,
                      "y": 20,
                      "width": 400,
                      "height": 80,
                      "_mouseState": 1,
                      "text": "我的身价(金币)",
                      "font": "STZhongsong",
                      "fontSize": 40,
                      "color": "#191919",
                      "bold": true,
                      "valign": "middle"
                    },
                    {
                      "_$id": "pts0000d",
                      "_$type": "GTextInput",
                      "name": "priceInp",
                      "x": 20,
                      "y": 110,
                      "width": 300,
                      "height": 90,
                      "background": {
                        "_$type": "DrawRectCmd",
                        "lineWidth": 1,
                        "lineColor": "#d0d0d0",
                        "fillColor": "#ffffff"
                      },
                      "text": "",
                      "font": "STZhongsong",
                      "fontSize": 44,
                      "color": "#191919",
                      "valign": "middle",
                      "padding": [
                        16,
                        8,
                        16,
                        8
                      ],
                      "prompt": "1",
                      "promptColor": "#b2b2b2"
                    },
                    {
                      "_$id": "pts0000e",
                      "_$type": "GTextField",
                      "name": "priceSave",
                      "x": 340,
                      "y": 110,
                      "width": 200,
                      "height": 90,
                      "_mouseState": 2,
                      "background": {
                        "_$type": "DrawRectCmd",
                        "fillColor": "#07c160"
                      },
                      "text": "保存",
                      "font": "STZhongsong",
                      "fontSize": 40,
                      "color": "#ffffff",
                      "bold": true,
                      "align": "center",
                      "valign": "middle"
                    },
                    {
                      "_$id": "pts0000f",
                      "_$type": "GTextField",
                      "name": "priceHint",
                      "x": 20,
                      "y": 210,
                      "width": 824,
                      "height": 60,
                      "_mouseState": 1,
                      "text": "身价是自己的展示设置(0-500), 加好友不转移金币",
                      "font": "STZhongsong",
                      "fontSize": 30,
                      "color": "#999999",
                      "valign": "middle"
                    },
                    {
                      "_$id": "hidemyid01",
                      "_$prefab": "c008a142-015d-42f3-abf0-bca3b44b3c12",
                      "name": "hideId",
                      "active": true,
                      "x": 40,
                      "y": 300,
                      "width": 196,
                      "height": 64,
                      "scaleX": 2,
                      "scaleY": 2,
                      "visible": true,
                      "title": "ID已屏蔽",
                      "selectedTitle": "屏蔽ID"
                    }
                  ]
                }
              ]
            },
            {
              "_$id": "pts00001",
              "_$type": "GButton",
              "name": "tabSet",
              "y": 260,
              "width": 220,
              "height": 130,
              "_mouseState": 2,
              "controllers": {
                "_$type": "Record",
                "button": {
                  "_$type": "Controller",
                  "pages": [
                    "up",
                    "down",
                    "over",
                    "selectedOver",
                    "disabled",
                    "selectedDisabled"
                  ]
                }
              },
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "9vq6pfhg"
                  },
                  "data": [
                    3,
                    0
                  ]
                }
              ],
              "title": "设置",
              "selectedTitle": "设置",
              "mode": 2,
              "_$child": [
                {
                  "_$id": "pts00002",
                  "_$type": "GBox",
                  "name": "bgNormal",
                  "width": 220,
                  "height": 130,
                  "_mouseState": 1,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "lineWidth": 1,
                    "lineColor": "#e0e0e0",
                    "fillColor": "#f2f2f2"
                  },
                  "gears": [
                    {
                      "_$type": "GearDisplay",
                      "controller": {
                        "_$ref": "pts00001",
                        "_$ctrl": "button"
                      },
                      "pages": [
                        0,
                        2,
                        4
                      ]
                    }
                  ]
                },
                {
                  "_$id": "pts00003",
                  "_$type": "GBox",
                  "name": "bgSel",
                  "width": 220,
                  "height": 130,
                  "_mouseState": 1,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "lineWidth": 1,
                    "lineColor": "#e0e0e0",
                    "fillColor": "#07c160"
                  },
                  "gears": [
                    {
                      "_$type": "GearDisplay",
                      "controller": {
                        "_$ref": "pts00001",
                        "_$ctrl": "button"
                      },
                      "pages": [
                        1,
                        3,
                        5
                      ]
                    }
                  ]
                },
                {
                  "_$id": "pts00004",
                  "_$type": "GTextField",
                  "name": "t",
                  "width": 220,
                  "height": 130,
                  "_mouseState": 1,
                  "text": "设置",
                  "font": "STZhongsong",
                  "fontSize": 44,
                  "color": "#191919",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                }
              ]
            },
            {
              "_$id": "pts00006",
              "_$type": "GButton",
              "name": "tabPrivacy",
              "y": 390,
              "width": 220,
              "height": 130,
              "_mouseState": 2,
              "controllers": {
                "_$type": "Record",
                "button": {
                  "_$type": "Controller",
                  "pages": [
                    "up",
                    "down",
                    "over",
                    "selectedOver",
                    "disabled",
                    "selectedDisabled"
                  ]
                }
              },
              "relations": [
                {
                  "_$type": "Relation",
                  "target": {
                    "_$ref": "9vq6pfhg"
                  },
                  "data": [
                    3,
                    0
                  ]
                }
              ],
              "title": "隐私",
              "selectedTitle": "隐私",
              "mode": 2,
              "_$child": [
                {
                  "_$id": "pts00007",
                  "_$type": "GBox",
                  "name": "bgNormal",
                  "width": 220,
                  "height": 130,
                  "_mouseState": 1,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "lineWidth": 1,
                    "lineColor": "#e0e0e0",
                    "fillColor": "#f2f2f2"
                  },
                  "gears": [
                    {
                      "_$type": "GearDisplay",
                      "controller": {
                        "_$ref": "pts00006",
                        "_$ctrl": "button"
                      },
                      "pages": [
                        0,
                        2,
                        4
                      ]
                    }
                  ]
                },
                {
                  "_$id": "pts00008",
                  "_$type": "GBox",
                  "name": "bgSel",
                  "width": 220,
                  "height": 130,
                  "_mouseState": 1,
                  "background": {
                    "_$type": "DrawRectCmd",
                    "lineWidth": 1,
                    "lineColor": "#e0e0e0",
                    "fillColor": "#07c160"
                  },
                  "gears": [
                    {
                      "_$type": "GearDisplay",
                      "controller": {
                        "_$ref": "pts00006",
                        "_$ctrl": "button"
                      },
                      "pages": [
                        1,
                        3,
                        5
                      ]
                    }
                  ]
                },
                {
                  "_$id": "pts00009",
                  "_$type": "GTextField",
                  "name": "t",
                  "width": 220,
                  "height": 130,
                  "_mouseState": 1,
                  "text": "隐私",
                  "font": "STZhongsong",
                  "fontSize": 44,
                  "color": "#191919",
                  "bold": true,
                  "align": "center",
                  "valign": "middle"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "_$id": "hvp455c4",
      "_$type": "GBox",
      "name": "item4",
      "y": 188,
      "width": 1180,
      "height": 2042,
      "_mouseState": 2,
      "mouseThrough": true,
      "zIndex": 1,
      "gears": [
        {
          "_$type": "GearDisplay",
          "controller": {
            "_$ref": "yfk534ud",
            "_$ctrl": "c0"
          },
          "pages": [
            4
          ],
          "condition": 1
        }
      ],
      "relations": [
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "xyewy7mo"
          },
          "data": [
            1,
            0,
            12,
            0
          ]
        },
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "qelj0un4"
          },
          "data": [
            23,
            0
          ]
        }
      ],
      "_$child": [
        {
          "_$id": "alit6m8q",
          "_$prefab": "b0c7f4b6-9a33-4cd8-897e-4888efe760fe",
          "name": "setting",
          "active": true,
          "x": 413,
          "y": 1259,
          "width": 354,
          "height": 131,
          "visible": true,
          "relations": [
            {
              "_$type": "Relation",
              "target": {
                "_$ref": "hvp455c4"
              },
              "data": [
                6,
                0
              ]
            }
          ],
          "title": "清除数据",
          "titleColor": "#000000",
          "titleFontSize": 70,
          "selectedTitle": "购买",
          "sound": "",
          "_$child": [
            {
              "_$override": "ug1dmopr",
              "src": "",
              "color": "#ffdddd",
              "background": {
                "_$type": "DrawRoundRectCmd",
                "lt": 40,
                "rt": 40,
                "lb": 40,
                "rb": 40,
                "lineWidth": 20,
                "lineColor": "#b67930",
                "fillColor": "#bf7625"
              }
            },
            {
              "_$override": "asxzquct",
              "src": "",
              "background": {
                "_$type": "DrawRoundRectCmd",
                "lt": 40,
                "rt": 40,
                "lb": 40,
                "rb": 40,
                "lineWidth": 20,
                "lineColor": "#c19248",
                "fillColor": "#a18040"
              }
            },
            {
              "_$override": "syt0gdq4",
              "src": "",
              "background": {
                "_$type": "DrawRoundRectCmd",
                "lt": 40,
                "rt": 40,
                "lb": 40,
                "rb": 40,
                "lineWidth": 20,
                "lineColor": "#da742d",
                "fillColor": "#f28214"
              }
            },
            {
              "_$override": "kahpmowa",
              "color": "#000000",
              "text": "清除数据",
              "font": "STXinwei",
              "fontSize": 70
            }
          ]
        }
      ]
    }
  ]
}