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
  "_$comp": [
    {
      "_$type": "14eb768e-8e14-4ebc-976e-f7e4383a834e",
      "scriptPath": "../src/ui/slecet.ts",
      "text": ""
    }
  ],
  "_$child": [
    {
      "_$id": "gd2l37ts",
      "_$type": "Area2D",
      "name": "Area2D",
      "width": 1170,
      "height": 2532,
      "mouseThrough": true,
      "_$child": [
        {
          "_$id": "910ch0yi",
          "_$type": "Camera2D",
          "name": "Camera2D",
          "x": 585,
          "y": 1266,
          "width": 1170,
          "height": 2532,
          "anchorX": 0.5,
          "anchorY": 0.5,
          "mouseThrough": true,
          "ignoreRotation": false,
          "isMain": true,
          "limit_Left": 0,
          "limit_Right": 1170,
          "limit_Bottom": 2532,
          "limit_Top": 0,
          "positionSpeed": null,
          "drag_Left": 3.144,
          "drag_Right": 3.514,
          "drag_Top": 1.916,
          "drag_Bottom": 2.336
        },
        {
          "_$id": "ahjvm9ro",
          "_$var": true,
          "_$type": "ViewStack",
          "name": "list",
          "x": 103,
          "y": 894,
          "width": 1054,
          "height": 587,
          "_mouseState": 2,
          "mouseThrough": true,
          "selectedIndex": 0,
          "_$child": [
            {
              "_$id": "om3xy2p4",
              "_$type": "Box",
              "name": "item0",
              "width": 1054,
              "height": 587,
              "_mouseState": 2,
              "left": 0,
              "right": 0,
              "top": 0,
              "bottom": 0,
              "_$child": [
                {
                  "_$id": "lvs6l874",
                  "_$var": true,
                  "_$type": "Sprite",
                  "name": "trace",
                  "x": -15,
                  "y": 24,
                  "width": 950,
                  "height": 500,
                  "zIndex": 2,
                  "_gcmds": [
                    {
                      "_$type": "FillTextCmd",
                      "text": "Loading...",
                      "x": 50,
                      "y": 50,
                      "font": "italic 100px SimSun",
                      "color": "#ffffff",
                      "align": null,
                      "strokeColor": "#000000"
                    },
                    {
                      "_$type": "DrawRectCmd",
                      "lineWidth": 2,
                      "lineColor": "#000000"
                    }
                  ]
                }
              ]
            },
            {
              "_$id": "23nlrxfl",
              "_$type": "Box",
              "name": "item1",
              "width": 1054,
              "height": 587,
              "visible": false,
              "_mouseState": 2,
              "left": 0,
              "right": 0,
              "top": 0,
              "bottom": 0,
              "_$child": [
                {
                  "_$id": "y8r1v1kh",
                  "_$type": "Sprite",
                  "name": "boom",
                  "x": -15,
                  "y": 24,
                  "width": 950,
                  "height": 500,
                  "zIndex": 2,
                  "_gcmds": [
                    {
                      "_$type": "FillTextCmd",
                      "text": "Loading...",
                      "x": 50,
                      "y": 50,
                      "font": "italic 100px SimSun",
                      "color": "#ffffff",
                      "align": null,
                      "strokeColor": "#000000"
                    },
                    {
                      "_$type": "DrawRectCmd",
                      "lineWidth": 2,
                      "lineColor": "#000000"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "_$id": "i91spcw3",
          "_$type": "Sprite",
          "name": "Sprite",
          "x": 43,
          "y": 874,
          "width": 1054,
          "height": 587,
          "mouseThrough": true,
          "_gcmds": [
            {
              "_$type": "DrawRectCmd",
              "fillColor": "#c6a478"
            }
          ]
        },
        {
          "_$id": "4vvnfuat",
          "_$type": "Panel",
          "name": "Panel",
          "x": 45,
          "y": 1466,
          "width": 1053,
          "height": 123,
          "mouseThrough": true,
          "scrollType": 1,
          "_$child": [
            {
              "_$id": "nt5ynvys",
              "_$type": "HBox",
              "name": "HBox",
              "width": 1246,
              "height": 101,
              "_mouseState": 2,
              "mouseThrough": true,
              "space": 0,
              "_$child": [
                {
                  "_$id": "2asfpe6c",
                  "_$type": "Text",
                  "name": "0",
                  "width": 414,
                  "height": 102,
                  "text": "轨迹序列",
                  "font": "ArialUnicodeMS",
                  "fontSize": 80,
                  "color": "#ffffff",
                  "align": "center",
                  "valign": "middle",
                  "leading": 2
                },
                {
                  "_$id": "4oeyeww4",
                  "_$type": "Text",
                  "name": "1",
                  "x": 414,
                  "width": 414,
                  "height": 102,
                  "text": "星战纪",
                  "font": "ArialUnicodeMS",
                  "fontSize": 80,
                  "color": "#ffffff",
                  "align": "center",
                  "valign": "middle",
                  "leading": 2
                },
                {
                  "_$id": "lgi63tba",
                  "_$type": "Text",
                  "name": "2",
                  "x": 828,
                  "width": 414,
                  "height": 102,
                  "text": "魔法牌传说",
                  "font": "ArialUnicodeMS",
                  "fontSize": 80,
                  "color": "#ffffff",
                  "align": "center",
                  "valign": "middle",
                  "leading": 2
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}