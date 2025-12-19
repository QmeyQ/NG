{
  "_$ver": 1,
  "_$id": "lx8mwule",
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
      "_$type": "Mesh2DRender",
      "layer": 0,
      "color": {
        "_$type": "Color"
      },
      "tilingOffset": {
        "_$type": "Vector4",
        "z": 1,
        "w": 1
      }
    },
    {
      "_$type": "ba889597-8353-4021-a309-62447c89d901",
      "scriptPath": "../src/traceSel.ts",
      "catimg": {
        "_$ref": "5gssj6qc"
      },
      "sprite": {
        "_$ref": "hfj770qg"
      },
      "catg": {
        "_$ref": "m1fg33xz"
      },
      "text": ""
    }
  ],
  "_$child": [
    {
      "_$id": "91yvrqa1",
      "_$var": true,
      "_$type": "Area2D",
      "name": "Area2D",
      "width": 1170,
      "height": 2532,
      "_$child": [
        {
          "_$id": "2a84jyuu",
          "_$type": "Box",
          "name": "View",
          "width": 1170,
          "height": 2532,
          "_mouseState": 2,
          "left": 0,
          "right": 0,
          "top": 0,
          "bottom": 0,
          "_$child": [
            {
              "_$id": "kd6chlbl",
              "_$var": true,
              "_$type": "List",
              "name": "list",
              "x": 97,
              "y": 556,
              "width": 991,
              "height": 1896,
              "_mouseState": 2,
              "top": 556,
              "bottom": 80,
              "itemTemplate": {
                "_$ref": "3qi92d57",
                "_$tmpl": "itemRender"
              },
              "repeatX": 3,
              "repeatY": 6,
              "spaceX": 45,
              "spaceY": 40,
              "scrollType": 2,
              "selectEnable": true,
              "_$child": [
                {
                  "_$id": "3qi92d57",
                  "_$type": "Box",
                  "name": "Box",
                  "x": -3,
                  "y": -4,
                  "width": 295,
                  "height": 420,
                  "_$child": [
                    {
                      "_$id": "goz1v4ko",
                      "_$type": "Sprite",
                      "name": "hero",
                      "x": 70,
                      "y": 11,
                      "width": 224,
                      "height": 319
                    },
                    {
                      "_$id": "6esa30om",
                      "_$type": "Sprite",
                      "name": "bg",
                      "x": 51,
                      "width": 224,
                      "height": 319,
                      "zIndex": -1,
                      "_gcmds": [
                        {
                          "_$type": "DrawRectCmd",
                          "fillColor": "#8b8b8b"
                        }
                      ]
                    },
                    {
                      "_$id": "d9e6wwtm",
                      "_$type": "Label",
                      "name": "name",
                      "x": 36,
                      "y": 350,
                      "width": 237,
                      "height": 75,
                      "centerX": 7,
                      "text": "99",
                      "font": "Microsoft YaHei",
                      "fontSize": 30,
                      "bold": true,
                      "align": "center",
                      "valign": "middle",
                      "leading": 0
                    }
                  ]
                }
              ]
            },
            {
              "_$id": "5gssj6qc",
              "_$var": true,
              "_$type": "Image",
              "name": "itemImg",
              "x": 98,
              "y": 111,
              "width": 262,
              "height": 268,
              "scaleX": 1.5,
              "scaleY": 1.5,
              "left": 98,
              "top": 111,
              "color": "#ffffff"
            },
            {
              "_$id": "sjjjuh14",
              "_$type": "Label",
              "name": "Label",
              "x": 548,
              "y": 191,
              "width": 120,
              "height": 35,
              "text": "宝物名字",
              "font": "SimHei",
              "fontSize": 26,
              "color": "#FFFFFF",
              "leading": 0
            },
            {
              "_$id": "26ae1eos",
              "_$var": true,
              "_$type": "Label",
              "name": "itemNumber",
              "x": 548,
              "y": 241,
              "width": 120,
              "height": 35,
              "text": "数量 100",
              "font": "SimHei",
              "fontSize": 26,
              "color": "#FFFFFF",
              "leading": 0
            },
            {
              "_$id": "wtg56lc7",
              "_$var": true,
              "_$type": "TextArea",
              "name": "itemReadme",
              "x": 541,
              "y": 323,
              "width": 332,
              "height": 150,
              "_mouseState": 2,
              "text": "宝物说明， \n\n此处省略100字",
              "font": "SimHei",
              "fontSize": 32,
              "color": "#FFFFFF",
              "leading": 0,
              "padding": "6,6,6,6",
              "sizeGrid": "10,12,10,12,0",
              "maxChars": 100000,
              "restrict": "",
              "promptColor": "#A9A9A9"
            },
            {
              "_$id": "hfj770qg",
              "_$var": true,
              "_$type": "Sprite",
              "name": "Sprite",
              "width": 0,
              "height": 0
            }
          ]
        }
      ]
    },
    {
      "_$id": "5ortnylm",
      "_$type": "Camera2D",
      "name": "Camera2D",
      "x": 591,
      "y": 1334,
      "width": 1142,
      "height": 2510,
      "anchorX": 0.49985621307390615,
      "anchorY": 0.5261579371928113,
      "isMain": true,
      "positionSpeed": null
    },
    {
      "_$id": "m1fg33xz",
      "_$var": true,
      "_$type": "Sprite",
      "name": "catgirl",
      "x": 791,
      "y": 1220,
      "width": 3724,
      "height": 3724,
      "anchorX": 0.538,
      "anchorY": 0.569,
      "_$comp": [
        {
          "_$type": "Spine2DRenderNode",
          "layer": 0,
          "source": "res://c7386572-8b1d-4a44-8642-649c8841135f",
          "animationName": "attack",
          "preview": true,
          "physicsUpdate": 2,
          "premultipliedAlpha": true
        }
      ]
    }
  ]
}