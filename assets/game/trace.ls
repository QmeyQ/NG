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
      "_$type": "7bad1742-6eed-4d8d-81c0-501dc5bf03d6",
      "scriptPath": "../src/Main.ts",
      "text": ""
    },
    {
      "_$type": "Mesh2DRender",
      "layer": 0,
      "color": {
        "_$type": "Color"
      }
    }
  ],
  "_$child": [
    {
      "_$id": "91yvrqa1",
      "_$type": "Area2D",
      "name": "Area2D",
      "width": 1170,
      "height": 2532,
      "_$child": [
        {
          "_$id": "s7fp44v9",
          "_$prefab": "b7799c91-363b-4f1f-acce-023b9b533b3a",
          "name": "select",
          "active": true,
          "x": 0,
          "y": 0,
          "visible": true,
          "left": 0,
          "right": 0,
          "top": 0,
          "bottom": 0,
          "_$child": [
            {
              "_$override": "pwiq0gjk",
              "selectedIndex": 2,
              "name": "list"
            },
            {
              "_$override": "lsl1cl3m",
              "text": ""
            },
            {
              "_$override": "jrvot09l",
              "skin": null
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
        },
        {
          "_$id": "tbn4tgwt",
          "_$type": "Sprite",
          "name": "master",
          "x": 596,
          "y": 1196,
          "width": 200,
          "height": 200,
          "anchorX": 0.5,
          "anchorY": 0.5,
          "_gcmds": [],
          "_$comp": [
            {
              "_$id": "guz1",
              "_$type": "RigidBody",
              "applyOwnerColliderComponent": false,
              "shapes": [
                {
                  "_$type": "CircleShape2D",
                  "x": 100,
                  "y": 100,
                  "density": 1,
                  "restitution": 1,
                  "restitutionThreshold": 1,
                  "friction": 0.2,
                  "radius": 80
                }
              ],
              "gravityScale": 0,
              "linearDamping": 0.5,
              "bullet": true,
              "allowRotation": false
            }
          ],
          "_$child": [
            {
              "_$id": "nfcvx7t0",
              "_$type": "Camera2D",
              "name": "Camera2D",
              "x": 100,
              "y": 100,
              "width": 1170,
              "height": 2532,
              "anchorX": 0.5,
              "anchorY": 0.5,
              "isMain": true,
              "limit_Left": -1501,
              "limit_Right": 1500,
              "limit_Bottom": 3000,
              "limit_Top": 0,
              "positionSpeed": 0.5,
              "dragHorizontalEnable": true,
              "drag_Left": 0.376,
              "drag_Right": 0.428,
              "dragVerticalEnable": true,
              "drag_Top": 0.302,
              "drag_Bottom": 0.307
            }
          ]
        }
      ]
    }
  ]
}