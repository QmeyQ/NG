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
      }
    },
    {
      "_$type": "ba889597-8353-4021-a309-62447c89d901",
      "scriptPath": "../src/traceSel.ts",
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
              "skin": "resources/UI/images/bag/12.png",
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
              "_$type": "Sprite",
              "name": "Sprite",
              "width": 0,
              "height": 0
            }
          ]
        },
        {
          "_$id": "7o4iyr1u",
          "_$type": "Sprite",
          "name": "Sprite",
          "x": 585,
          "y": 1500,
          "width": 3000,
          "height": 3000,
          "anchorX": 0.5,
          "anchorY": 0.5,
          "_$comp": [
            {
              "_$id": "mhek",
              "_$type": "StaticCollider",
              "shapes": [
                {
                  "_$type": "BoxShape2D",
                  "x": 0,
                  "y": 0,
                  "density": 10,
                  "restitution": 0,
                  "restitutionThreshold": 1,
                  "friction": 0.2,
                  "width": 942.0000000000002,
                  "height": 942.0000000000017
                },
                {
                  "_$type": "BoxShape2D",
                  "x": 2054.0000000000005,
                  "y": 2.0000000000378897,
                  "density": 10,
                  "restitution": 0,
                  "restitutionThreshold": 1,
                  "friction": 0.2,
                  "width": 943.0000000000006,
                  "height": 935.9999999999818
                },
                {
                  "_$type": "BoxShape2D",
                  "x": 0,
                  "y": 0,
                  "density": 10,
                  "restitution": 0,
                  "restitutionThreshold": 1,
                  "friction": 0.2,
                  "width": 2999.0000000000005,
                  "height": 718.0000000000009
                },
                {
                  "_$type": "BoxShape2D",
                  "x": 1.000000000003109,
                  "y": 2294.000000000003,
                  "density": 10,
                  "restitution": 0,
                  "restitutionThreshold": 1,
                  "friction": 0.2,
                  "width": 2997.000000000001,
                  "height": 365.999999999999
                },
                {
                  "_$type": "BoxShape2D",
                  "x": 4.000000000004821,
                  "y": 2044.9999999999995,
                  "density": 10,
                  "restitution": 0,
                  "restitutionThreshold": 1,
                  "friction": 0.2,
                  "width": 940.999999999999,
                  "height": 606.9999999999987
                },
                {
                  "_$type": "BoxShape2D",
                  "x": 2053.000000000001,
                  "y": 2052.0000000000023,
                  "density": 10,
                  "restitution": 0,
                  "restitutionThreshold": 1,
                  "friction": 0.2,
                  "width": 948.0000000000015,
                  "height": 725.9999999999993
                },
                {
                  "_$type": "BoxShape2D",
                  "x": 0,
                  "y": 0,
                  "density": 10,
                  "restitution": 0,
                  "restitutionThreshold": 1,
                  "friction": 0.2,
                  "width": 726.000000000002,
                  "height": 2968
                },
                {
                  "_$type": "BoxShape2D",
                  "x": 2275.0000000000005,
                  "y": 622.999999999999,
                  "density": 10,
                  "restitution": 0,
                  "restitutionThreshold": 1,
                  "friction": 0.2,
                  "width": 721.999999999999,
                  "height": 1756
                }
              ]
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
    }
  ]
}