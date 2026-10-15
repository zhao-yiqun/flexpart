"""Create display-only mesh copies, preserving every part and scene transform.

Quadratic simplification runs independently within each original GLB primitive;
no label merging or segmentation inference is performed. Originals are untouched.
"""
import json
import hashlib
import shutil
from pathlib import Path
import numpy as np
import trimesh

ROOT=Path(__file__).resolve().parents[1]

def main():
    records=json.loads((ROOT/'source-manifest.json').read_text())['assets']
    out=ROOT/'assets/models'; out.mkdir(exist_ok=True)
    report=[]
    for item in records:
        if 'mesh' not in item: continue
        target=out/(item['asset'].replace('.png','.glb'))
        source=Path(item['mesh'])
        prompt=source.with_suffix('.txt')
        if prompt.exists(): shutil.copy2(prompt,target.with_suffix('.txt'))
        if target.exists():
            print('cached', target.name, flush=True); continue
        source=Path(item['mesh'])
        scene=trimesh.load(source,force='scene',process=False)
        result=trimesh.Scene()
        before=after=0
        for node in scene.graph.nodes_geometry:
            transform, geom_name=scene.graph[node]
            mesh=scene.geometry[geom_name].copy()
            mesh.apply_transform(transform)
            before+=len(mesh.faces)
            color=mesh.visual.main_color.copy()
            # At least 250 triangles on tiny parts; keep every named region.
            count=min(len(mesh.faces),max(250,int(len(mesh.faces)*0.13)))
            if count<len(mesh.faces):
                mesh=mesh.simplify_quadric_decimation(face_count=count, aggression=5)
            mesh.visual=trimesh.visual.ColorVisuals(mesh,face_colors=color)
            after+=len(mesh.faces)
            result.add_geometry(mesh,node_name=node,geom_name=geom_name)
        result.export(target)
        rec={'output':str(target.relative_to(ROOT)),'source':str(source),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'input_faces':before,'display_faces':after,'parts':len(result.geometry),'operation':'independent per-part display simplification; transforms applied; source palette preserved'}
        report.append(rec)
        (ROOT/'mesh-preparation.json').write_text(json.dumps(report,indent=2)+'\n')
        print(rec,flush=True)

if __name__=='__main__': main()
