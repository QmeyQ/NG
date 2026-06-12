{
  "_$ver": 1,
  "_$id": "scensze8",
  "_$type": "Scene",
  "left": 0,
  "right": 0,
  "top": 0,
  "bottom": 0,
  "name": "Scene2D",
  "width": 1170,
  "height": 2532,
  "_$child": [
    {
      "_$id": "s7vzuk8y",
      "_$type": "Scene3D",
      "name": "Scene3D",
      "skyRenderer": {
        "meshType": "dome"
      },
      "ambientColor": {
        "_$type": "Color",
        "r": 0.212,
        "g": 0.227,
        "b": 0.259
      },
      "_$comp": [
        {
          "_$type": "e8a95ca0-651f-48bc-b47e-0f93d6b7f3c3",
          "scriptPath": "../src/NewScript.ts",
          "Sprite": null,
          "linyueru": null,
          "courtNet": {
            "_$ref": [
              "r0hs7t69",
              "#43"
            ]
          },
          "courtFloor": null,
          "ball": {
            "_$ref": "fhhskmwh"
          },
          "p1": {
            "_$ref": "j21ggy5d"
          },
          "p2": null,
          "p3": null,
          "p4": null,
          "camera": {
            "_$ref": "dlfcodgw"
          }
        }
      ],
      "_$child": [
        {
          "_$id": "r0hs7t69",
          "_$prefab": "0d67e488-b658-427f-a24e-9add580694fa",
          "name": "court",
          "active": true,
          "layer": 0,
          "transform": {
            "localPosition": {
              "_$type": "Vector3"
            },
            "localRotation": {
              "_$type": "Quaternion"
            },
            "localScale": {
              "_$type": "Vector3",
              "x": 1,
              "y": 1,
              "z": 1
            }
          },
          "_$child": [
            {
              "_$override": "#43",
              "_$comp": [
                {
                  "_$type": "PhysicsCollider",
                  "colliderShape": {
                    "_$type": "MeshColliderShape",
                    "mesh": {
                      "_$uuid": "0d67e488-b658-427f-a24e-9add580694fa@lm1",
                      "_$type": "Mesh"
                    }
                  },
                  "collisionGroup": 1,
                  "canCollideWith": -1,
                  "isTrigger": true
                }
              ]
            }
          ]
        },
        {
          "_$id": "fhhskmwh",
          "_$type": "Sprite3D",
          "name": "Cone",
          "transform": {
            "localPosition": {
              "_$type": "Vector3",
              "x": -1.0451229938247577,
              "y": 1.36
            },
            "localScale": {
              "_$type": "Vector3",
              "x": 0.3,
              "y": 0.1099995,
              "z": 0.37
            }
          },
          "_$comp": [
            {
              "_$type": "MeshFilter",
              "sharedMesh": {
                "_$uuid": "6e013e32-fec7-4397-80d1-f918a07607be",
                "_$type": "Mesh"
              }
            },
            {
              "_$type": "MeshRenderer",
              "lightmapScaleOffset": {
                "_$type": "Vector4"
              },
              "sharedMaterials": [
                {
                  "_$uuid": "6f90bbb0-bcb2-4311-8a9d-3d8277522098",
                  "_$type": "Material"
                }
              ]
            }
          ]
        },
        {
          "_$id": "j21ggy5d",
          "_$prefab": "d719ff85-d301-4312-9fda-2824ceb07d75",
          "name": "cha",
          "active": true,
          "layer": 0,
          "transform": {
            "localPosition": {
              "_$type": "Vector3",
              "y": 0.8338983648606577,
              "z": -1.7802833318710327
            },
            "localRotation": {
              "_$type": "Quaternion"
            },
            "localScale": {
              "_$type": "Vector3",
              "x": 1,
              "y": 1,
              "z": 1
            }
          },
          "_$comp": [
            {
              "_$override": "Animator",
              "controller": {
                "_$uuid": "25372f81-5a20-4b5f-b543-d09eea7755e3",
                "_$type": "AnimationController"
              },
              "cullingMode": 0
            }
          ],
          "_$child": [
            {
              "_$override": "#227",
              "_$comp": [
                {
                  "_$type": "PhysicsCollider",
                  "colliderShape": {
                    "_$type": "MeshColliderShape",
                    "mesh": {
                      "_$uuid": "d719ff85-d301-4312-9fda-2824ceb07d75@lm1",
                      "_$type": "Mesh"
                    }
                  },
                  "collisionGroup": 1,
                  "canCollideWith": -1,
                  "isTrigger": true
                }
              ]
            },
            {
              "_$id": "z9lhuh1l",
              "_$parent": "#227",
              "_$type": "Sprite3D",
              "name": "PointLight",
              "transform": {
                "localPosition": {
                  "_$type": "Vector3",
                  "x": 0.03750113025307655,
                  "y": 0.4506252110004425,
                  "z": 0.3873067796230316
                },
                "localRotation": {
                  "_$type": "Quaternion",
                  "x": -0.13592823303975135,
                  "y": 0.02096052260349156,
                  "z": -0.033199362089559266,
                  "w": 0.9899403892718622
                },
                "localScale": {
                  "_$type": "Vector3",
                  "x": 1.0000002108791257,
                  "y": 1.0000003427659292,
                  "z": 1.000000236669228
                }
              },
              "_$comp": [
                {
                  "_$type": "PointLightCom",
                  "lightmapBakedType": 0,
                  "power": 10,
                  "radius": 0.01,
                  "maxBounces": 1024
                }
              ]
            },
            {
              "_$id": "dlfcodgw",
              "_$type": "Camera",
              "name": "Camera",
              "transform": {
                "localPosition": {
                  "_$type": "Vector3",
                  "x": -5.857834831273771,
                  "y": 0.13007938715861822,
                  "z": 0.3606626835408995
                },
                "localRotation": {
                  "_$type": "Quaternion",
                  "x": -1.9257498171471578e-11,
                  "y": -0.7071067865923564,
                  "z": -6.530006421106729e-9,
                  "w": 0.7071067757807387
                },
                "localScale": {
                  "_$type": "Vector3",
                  "x": 0.9999999403953581,
                  "y": 1.0000000000000004,
                  "z": 1
                }
              },
              "fieldOfView": 61,
              "nearPlane": 0.3,
              "farPlane": 1000,
              "clearColor": {
                "_$type": "Color",
                "r": 0.39215686274509803,
                "g": 0.5843137254901961,
                "b": 0.9294117647058824
              }
            }
          ]
        }
      ]
    }
  ]
}