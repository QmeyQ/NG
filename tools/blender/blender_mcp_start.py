import bpy, traceback, datetime, os
LOG = r"F:\LayaProject\tools\blender\blender_mcp_start.log"
def w(msg):
    with open(LOG,"a",encoding="utf-8") as f:
        f.write(datetime.datetime.now().isoformat()+" "+str(msg)+"\n")
def go():
    try:
        w("timer start addons="+str("mcp_for_blender" in bpy.context.preferences.addons))
        try:
            bpy.ops.preferences.addon_enable(module="mcp_for_blender")
        except Exception as e:
            w("enable: "+repr(e))
        r = bpy.ops.blendermcp.start_server()
        w("start result="+repr(r))
        s = getattr(bpy.types, "blendermcp_server", None)
        w("server="+repr(s)+" running="+repr(getattr(s,"running",None)))
    except Exception:
        w("ERR\n"+traceback.format_exc())
    return None
w("script load, background="+str(bpy.app.background))
bpy.app.timers.register(go, first_interval=2.0)
