"""Create original, narrated MP4 capsules and captions. No runtime TTS dependency.
Requires Pillow, ffmpeg/ffprobe, and ESPEAK_MODULE=/absolute/path/to/espeak-ng/dist/espeak-ng.js.
Uses a separate Node process for each narration; production app does not load eSpeak.
"""
import json, math, os, subprocess, tempfile, wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT/'scripts/video/capsules.json').read_text())
OUT = ROOT/'src/media'; OUT.mkdir(exist_ok=True)
(OUT/'capsules.js').write_text('/* Original capsule scripts and bundled-media metadata. */\nexport const VIDEO_CAPSULES = '+json.dumps(DATA,ensure_ascii=False,indent=2)+';\n')
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
W,H,FPS=960,540,12
INK='#173d39';BG='#f6f6ee';GOLD='#e9c274'
def font(size,bold=False):return ImageFont.truetype(BOLD if bold else FONT,size)
def wrap(draw,text,f,width):
 lines=[];line=''
 for word in text.split():
  trial=(line+' '+word).strip()
  if line and draw.textlength(trial,font=f)>width:lines.append(line);line=word
  else:line=trial
 if line:lines.append(line)
 return lines
def frame(capsule,scene,index,t,talking):
 im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
 d.rounded_rectangle((20,20,940,520),radius=28,fill='#fffef9',outline='#d4ddcb',width=2)
 d.text((45,40),'MISSION LECTURE · LIONEL · 2e SECONDAIRE',font=font(16,True),fill='#536d59')
 d.text((45,77),capsule['title'],font=font(31,True),fill=INK)
 # Original illustrated guide. Animate the mouth and eyebrow gently during narration.
 dx=int(2*math.sin(t*2))
 d.rounded_rectangle((46+dx,305,211+dx,471),radius=47,fill='#315d6c')
 d.text((99+dx,385),'M',font=font(44,True),fill=GOLD)
 d.rounded_rectangle((68+dx,150,188+dx,321),radius=49,fill='#bf875d',outline='#8c5c40',width=3)
 d.polygon([(65+dx,206),(64+dx,155),(91+dx,132),(160+dx,137),(193+dx,166),(190+dx,206),(139+dx,173),(86+dx,193)],fill='#373029')
 blink=(int(t*10)%43==0)
 for x in [99,159]:
  if blink:d.line((x-5+dx,231,x+5+dx,231),fill='#292920',width=3)
  else:d.ellipse((x-5+dx,224,x+5+dx,238),fill='#292920')
 mh=(8+int(6*(1+math.sin(t*20)))) if talking else 6
 d.ellipse((113+dx,267,143+dx,267+mh),fill='#633d37')
 d.text((83,480),'Milo',font=font(21,True),fill=INK)
 d.rounded_rectangle((238,147,909,443),radius=23,fill='#edf3e5')
 d.text((267,170),scene['label'],font=font(26,True),fill=INK)
 y=229
 for line in wrap(d,scene['example'],font(30,True),590):d.text((267,y),line,font=font(30,True),fill='#234f60');y+=45
 y=max(328,y+14)
 for line in wrap(d,scene['cue'],font(22),590):d.text((267,y),line,font=font(22),fill=INK);y+=33
 for i in range(len(capsule['scenes'])):
  x=265+i*52;d.rounded_rectangle((x,470,x+35,476),radius=3,fill=INK if i==index else '#ccd6c5')
 d.text((630,464),f'Étape {index+1}/{len(capsule["scenes"])} · voix synthétique',font=font(14),fill='#536d59')
 return im

def timestamp(seconds):
 ms=round(seconds*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
for capsule in DATA:
 with tempfile.TemporaryDirectory(prefix='mission-video-') as tmp:
  tmp=Path(tmp);segments=[];captions=['WEBVTT',''];elapsed=0
  for i,scene in enumerate(capsule['scenes']):
   text=tmp/f'{i}.txt';wav=tmp/f'{i}.wav';text.write_text(scene['narration'])
   subprocess.run(['node',str(ROOT/'scripts/video/speech.mjs'),os.environ['ESPEAK_MODULE'],str(text),str(wav)],check=True)
   with wave.open(str(wav)) as sound:duration=sound.getnframes()/sound.getframerate()
   total=math.ceil((duration+1.0)*FPS)/FPS
   silent=tmp/f'{i}-silent.mp4';segment=tmp/f'{i}.mp4'
   command=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{W}x{H}','-framerate',str(FPS),'-i','-','-an','-c:v','libx264','-preset','veryfast','-crf','25','-pix_fmt','yuv420p','-threads','2',str(silent)]
   process=subprocess.Popen(command,stdin=subprocess.PIPE)
   for n in range(round(total*FPS)):process.stdin.write(frame(capsule,scene,i,n/FPS,n/FPS<duration).tobytes())
   process.stdin.close()
   if process.wait()!=0:raise RuntimeError('Video encoding failed')
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(silent),'-i',str(wav),'-c:v','copy','-af','apad','-c:a','aac','-b:a','80k','-t',str(total),'-movflags','+faststart',str(segment)],check=True)
   segments.append(segment)
   # Readable caption chunks, spread over the spoken duration.
   words=scene['narration'].split();chunks=[' '.join(words[j:j+10]) for j in range(0,len(words),10)]
   for j,chunk in enumerate(chunks):captions.extend([f'{timestamp(elapsed+j*duration/len(chunks))} --> {timestamp(elapsed+(j+1)*duration/len(chunks))}',chunk,''])
   if i==0:frame(capsule,scene,0,1,False).save(OUT/f'{capsule["id"]}-poster.jpg',quality=88)
   elapsed+=total
  concat=tmp/'concat.txt';concat.write_text(''.join(f"file '{p}'\n" for p in segments))
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(OUT/f'{capsule["id"]}.mp4')],check=True)
  (OUT/f'{capsule["id"]}.fr.vtt').write_text('\n'.join(captions))
  print(capsule['id'],round(elapsed,1),'seconds',flush=True)
