# Circuit explanation (simple version)

* **Three buttons** pretend to be the lids. Press = lid opened. Each button connects a GPIO pin to ground; the ESP32's internal pull-up keeps the pin HIGH when nothing is pressed.
* **Three LEDs** show which compartment needs attention. Each has a 220 Ω resistor so it is not overloaded.
* **One buzzer** makes the sounds.
* **Three potentiometers** are knobs that pretend to be "how much medicine is left". Turn the knob down = less medicine. This is a **simulation**, not a weight measurement. A real version would use a load cell + HX711.
* All grounds are connected together; the knobs use 3.3 V.

Parts in `diagram.json`: `esp` (wokwi-esp32-devkit-v1), `btn1-3` (pushbutton), `led1-3`, `r1-3` (220 Ω), `pot1-3` (potentiometer), `bz1` (buzzer). 26 wires. Pin table: `firmware/pin_mapping.md`; picture: `wiring_diagram.svg`.

Verified: JSON parses, every wire ends on an existing part and a pin name that exists for that part type **according to my own list of pin names**. Not verified: opening the file in Wokwi (I cannot reach it from my environment). If Wokwi reports an unknown pin name, tell me the message; part layout positions are approximate and can be dragged.
