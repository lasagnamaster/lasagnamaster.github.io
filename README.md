# Home Heat

An interactive offline application based on the thermal model of the two-storey, four-zone building in Maths for Eng / Week 3. The interface, help, results, accessibility labels, and documentation are in English. Numbers use English formatting.

## Running the application

Open `index.html` in a modern browser. No installation, build, internet connection, or server is required. The fully self-contained `thermal-house.html` is also included: it can be copied and opened on its own.

## Controls

- **Point heating:** click inside a room or choose T₁–T₄. Drag the heater to move it. Power and heat distribution radius are adjustable. One continuous point heater operates at a time; clicking elsewhere moves it.
- **Daily cycle:** the heater is disabled and outdoor temperature follows a 24-hour sinusoid. Adjust its minimum, maximum, and warmest hour. Ground temperature remains constant.
- Use **Start / Pause**, **Reset**, **+24 h**, and the simulation speed slider. Speed changes playback only, not physical coefficients or the stable integration step. Actual speed may be lower on slower devices.
- Hover over a room, wall, slab, ground floor, or roof to see the local air temperature or construction-node temperature.
- All **16 heat capacities C** and **20 independent resistances R** are available in expandable groups. Their logarithmic slider ranges extend from one quarter to four times their fitted values. Changing the network restarts the simulation.
- Initial temperatures can be uniform throughout the house or taken from the 16 initial states in the solution. Press **Reset** to apply the selection.
- The ↺ button beside **Model parameters** restores the fitted coefficients and default settings while keeping the current model and experiment mode.
- Auto scale includes all temperatures inside the house, including construction nodes. Its limits are shown below the map. To compare frames on a fixed scale, disable it and set the limits under **Display**.
- Export temperature history to CSV, the house image to PNG, and settings to JSON. Imported settings are checked for structure and allowed ranges. History and settings are not sent over the network. History stays in memory until reset or the tab is closed.
- Keyboard: Tab moves between controls. With the house canvas focused, keys 1–4 place the heater in the corresponding room; Space starts or pauses the simulation.

## Keep 20 °C challenge

The third mode, **Keep 20 °C**, lasts exactly **72 simulated hours**, or approximately **90 real seconds** without pauses. Outdoor temperature changes throughout each day and the sun moves from right to left. Building, weather, initial-state, and speed controls are locked. Display settings do not affect the physics or score.

1. Select **Keep 20 °C → Manual**.
2. You may set heating powers before starting. The initial powers approximately offset heat losses at the first instant.
3. Press **Start 3-day run**. Adjust the **four independent whole-room heating sliders**, each from 0 to 2.5 kW. Each heater adds heat uniformly to its room's air cells; it is separate from the movable point heater.
4. Each room shows its average temperature and deviation from 20 °C. You may pause and adjust powers while paused. Simulated time and scoring stop during pauses.
5. After 72 hours, the simulation stops and displays the result. You can try again or watch automatic control.

**Autopilot** starts a new run of the same scenario, visibly moves the sliders, and disables manual changes. Switching to autopilot resets the manual run, so it cannot erase previously accumulated manual errors. **Fast-forward all 3 days** is available only in the demonstration: every physical step and score contribution is still computed; only playback is accelerated.

Returning to either laboratory mode restores its R, C, initial settings, selected simulation model, environment parameters, point heater, and colour scale. As with ordinary mode switching, experiment history starts again.

### Fixed challenge scenario

- Room grid: 20 × 14 cells, as in the spatial model.
- Bare-house resistances and the 12 construction heat capacities retain their fitted values. Third-day weather modifies exterior conductances and adds snow resistance to the outer roof branch as described below.
- The four effective air heat capacities are **eight times** their original values to make manual control practical during accelerated playback. Mixing conductance is fixed at **60 W/K**. This is a teaching profile, distinct from the original identified model.
- Ground temperature: 5 °C. Initial room averages: 20 °C. Shared constructions start at 20 °C. Exterior walls, ground floors, and the roof are initialised at balance temperatures between the initial boundaries. Laboratory settings do not change the challenge scenario.
- With h = t / 3600, outdoor temperature is:

  `Ta = -14 + 7 cos(2π(h - 15)/24) - 4 exp(-((h - 39)/11)²) - storm_cooling(h)`.

  This is a daily cycle with an additional cold spell on day two and the prescribed storm cooling on day three. The environment stays colder than the target, allowing heating to offset losses without negative power or air conditioning.

### Sun and actual solar heat gains

The sun rises at the right edge of the scene at 06:00 and sets at the left edge at 18:00. Its centre follows a continuous arc across the entire scene. At night, the trajectory continues below ground. The ground clips the disc and glow as they cross the horizon, so the sun gradually disappears behind it rather than being switched off at sunset. The daytime phase p increases from 0 to 1; solar heat intensity is proportional to `sin(πp)`.

The right-hand morning exposure is `(1 + cos(πp))/2`; the left-hand exposure is its complement. The distribution reverses in the evening. Demonstration coefficients allow up to 300 W of direct solar gain in each downstairs room and 420 W in each upstairs room at full exposure. Each exterior wall can receive an additional 85 W, and each roof section 140 W. Base daily sunlight multipliers are 1, 0.7, and 1.1, with additional third-day attenuation from storm clouds. All solar heat inputs are zero at night.

Within each room, direct gain is distributed from the exterior window using normalised weights `exp(-distance_in_cells/4)`, then propagates through the same thermal network. Sun position and heat gains use the same simulation clock. The rays and displayed solar power use the heat-input function. These are demonstration values: the coursework does not specify actual irradiance, materials, or the building's geographical orientation.

### Score from 0 to 100

The score evaluates the **average temperature of each room separately**, not the whole-house average or every individual cell. Overheating one room cannot offset another room being cold.

For room z at time t:

`instant_score_z = 100 × (1 - min(abs(Tz - 20) / 4, 1))`.

The final score averages this value across four rooms and all 72 hours. A room at 20 °C earns 100 points for that moment; 19 or 21 °C earns 75; 18 or 22 °C earns 50; an error of 4 °C or more earns 0. Penalties are integrated at every physical step using the trapezoidal average of errors before and after the step. Fast-forwarding does not skip any scoring interval.

Results also show mean absolute error (MAE), the share of time within 19.5–20.5 °C, and heating energy. Energy use does not affect the score. Challenge CSV exports include Q1…Q4 in W, total solar gain in W, and controller type.

### Why automatic control is ideal

Before each numerical step, the controller sums each room's passive heat flows `q_passive`, including weather, constructions, and sunlight. It then calculates:

`Q = clamp(-sum(q_passive) + C_zone × (20 - T_mean)/600 s, 0, 2500 W)`.

Power is distributed uniformly over the room's air cells. Starting from a 20 °C average, this balance preserves that average while power limits remain inactive. In the verified fixed scenario, powers stay approximately within 0.384–1.872 kW, the limits never activate, and all four means stay at 20 °C to floating-point precision.

Temperatures are not forcibly assigned during play and the score is not a constant. They follow the same numerical equations used for manual control. The controller has full access to the teaching model's state and heat flows; it is a demonstration reference, not a claim about real thermostat accuracy.

### Day 3: winter storm and snow blanket

From hour 48, wind and snowfall build smoothly. Wind peaks at 42 km/h, then settles by hour 61. Outdoor temperature receives an extra cooling term of up to 6 °C from the storm wind plus a 2 °C cold-front term. The nominal daily cycle and day-two cold spell still apply. This is an imposed air-temperature scenario, not a wind-chill correction applied to the house.

Wind multiplies window conductance by up to 1.18 and exterior wall/roof conductance by up to 1.25. Starting at hour 50, accumulated snow grows smoothly to 20 cm by hour 62 and remains until the end. Snow adds effective thermal resistance to the **outer roof half only**: `R_outer = R_bare × (1 + 2.5 × snow_fraction)`. Wind is applied to that effective branch as `G_outer = G_bare × (1 + 0.25 × wind_fraction) / (1 + 2.5 × snow_fraction)`. The inner roof half, walls, windows, floors, and all heat capacities retain their fitted values (apart from the challenge's existing air-capacity multiplier).

At full cover in calm weather, the two-half roof's steady heat transfer at a fixed indoor/outdoor temperature difference is `2 / (1 + 3.5) ≈ 44%` of the bare value, or about **56% less**. The banner reports this roof-only comparison; it is not a 56% reduction in whole-house heating. Temperatures still evolve through the RC network. Snow is represented as added resistance without a separate snow temperature, snow heat capacity, melting, or latent-heat model. The depth and resistance scaling are prescribed teaching values, not fitted material properties.

Snowfall attenuates solar input by up to 85%; after the storm, residual cloud cover reduces it by up to 20%. Drawing, accumulation, wind, weather, and heat exchange share the simulation clock and freeze when paused. Snowfall is rendered behind the house cutaway; snow remains on the roof and ground after the wind stops. CSV exports include wind speed, snow depth, extra cooling, and the outer-roof resistance multiplier. The same weather and conductance changes apply to manual control and autopilot.

The challenge uses `maxDt / 1.25` as a conservative stability margin for increased exterior conductance. Boundary heat accounting uses the actual time-varying conductances, preserving energy balance. Laboratory and Daily cycle modes do not receive the winter storm.

### Challenge verification

Run `node test-challenge.cjs` to check the fixed scenario, sun movement and solar gains, the 90-second duration, continuous sunrise and sunset at scene edges, independent heaters, continuous third-day weather, wind-enhanced heat loss, roof insulation at equal temperatures, lower heating energy with snow, numerical stability under wind, 72-hour automatic control, global energy balance including sunlight, exact stopping at 72 hours, manual scoring from integrated actual errors, reproducibility, and resetting. The nine original checks in `test-model.cjs` are also retained.

A complete automatic winter run has also been checked through the browser interface: 100/100, 100% of time within the comfort band, and 252.8 kWh. The browser CSV confirms 72 hours, all four room means at 20 °C, day-three-only wind/snow, 42 km/h peak wind, and a retained 20 cm blanket. Manual operation was checked on a 390 px viewport: heating T1 alone warms the upper-left room, the other three rooms cool with zero power, and CSV columns match the new numbering. Mobile layout has no horizontal overflow. Pausing freezes the weather as well as the thermal simulation. All 13 challenge checks and 9 original model checks pass.

## Source materials reviewed

Materials in `/Users/owner/Desktop/Sk/Maths for Eng/week3/`:

- `materials/R_Week3.pdf`: original diagram, zones 3–4 upstairs and 1–2 downstairs, Tg = 5 °C.
- `Week3_Solution.ipynb`: RC topology, equations, identification, physical assumptions, numerical implementation, diagnostics, and limitations. The supplementary ARX model is not used by this application.
- `Week3_Report_EN.pdf` and its source: full model discussion and validation results.
- `Week3_identified_model.npz`: exact parameters, initial states, matrices, and node names. Values are embedded in `engine.js`; the original NPZ is not required at runtime.

The solution contains 44,641 observations over 744 hours at one-minute intervals. Inputs are four heating signals and outdoor temperature; outputs are four room temperatures. In the original dataset, an enabled Control supplies 5000 kJ/h = 1.388889 kW. Parameters were fitted on the first 60% of the record, followed by 20% validation and 20% test. Reported test RMSE values are 0.130, 0.203, 0.310, and 0.356 °C. These refer to the original model driven by measured inputs, **not to the new spatial field**. The application does not refit parameters or load the dataset while running.

## Room numbering

The house and all visible controls use reading order: **T1 top left, T2 top right, T3 bottom left, T4 bottom right**. Heater shortcuts, keyboard keys 1–4, parameter labels, temperature probes, chart colours, result rows, and CSV temperature/heating columns follow this numbering.

The original coursework uses T3/T4 upstairs and T1/T2 downstairs. Display rooms 1, 2, 3, 4 therefore map to solver zones 3, 4, 1, 2. Construction and parameter labels are mapped too: displayed floors are F3/F4 and roof nodes P1/P2. Fitted data, internal solver arrays, and settings JSON retain the original coursework order, preserving saved settings and the original thermal network. The state order below refers to that original internal order.

## Original RC model

State order:

`T1 T2 T3 T4 O1 O2 O3 O4 V12 V13 V24 V34 F1 F2 P3 P4`.

- T: room air / fast effective room heat capacity.
- O: exterior walls, each between a room and outdoor air through two independently estimated resistance halves.
- V: shared partition or slab, with one node per shared construction.
- F: ground floors connected to the ground.
- P: roof branches of the upstairs rooms.
- Windows: direct resistance branches from Tᵢ to Tₐ.

Adjacencies are 1–2, 1–3, 2–4, and 3–4. There are no direct diagonal links. For shared constructions, ground floors, and the roof, each R slider represents **one half** of a branch; total static resistance is 2R.

Each node satisfies:

`C_i dT_i/dt = Σ_j G_ij (T_j − T_i) + Σ_b G_ib (T_b − T_i) + Q_i`.

**Original RC model** mode uses exactly this 16-node topology and the fitted coefficients. Each room is coloured uniformly. Placing the point heater selects that room's air node.

## Spatial extension

Each room is replaced by 20 × 14 air cells: 1120 air states plus 12 construction states in total. Each cell has capacity Cᵢ / 280. Construction states and capacities are retained.

- Conductance between a room and each construction node is divided equally across cells on the corresponding boundary; the sum equals the original G. Window branches are similarly distributed along the exterior side boundary.
- A room's exterior-wall node aggregates all its exterior walls in the original model. Locating this aggregate on the side boundary is a spatial-visualisation choice.
- Within a room, horizontal adjacent-cell conductance equals the `mixing` slider in W/K; vertical conductance is `mixing × (14/20)²`. This is an effective mixing parameter for demonstration, not one identified from the dataset or a CFD convection model.
- The point source uses normalised Gaussian weights within the selected room. Their sum is 1, so total heat input equals the selected power. Radius means the standard deviation, expressed as a percentage of room width; vertical distances are converted to the same schematic coordinates.
- Walls and the roof show aggregate RC-node temperatures, not a continuous field inside their materials. The pitched roof displays P₃ and P₄. There is no additional attic node.
- Total C and G values are preserved, but spatial-model dynamics differ from those of instantly mixed rooms. Local temperatures have not been validated against spatial measurements. The coursework does not provide real dimensions or materials; geometry is schematic.

## Daily cycle

`T_a(t) = (T_min + T_max)/2 + (T_max − T_min)/2 × cos(2π (t/3600 − peakHour)/24)`.

The clock starts at 00:00. The period is 24 hours; the minimum occurs 12 hours before/after the maximum. Qᵢ = 0 in every room. R, C, initial settings, and ground temperature do not change by themselves. Default weather ranges from −25 to +30 °C, with the maximum at 15:00.

## Numerical method and units

Internal units are J, W, seconds, and temperature differences in K. C sliders use kJ/K and R sliders K/kW, so `C_SI = 1000 C_UI` and `G_SI = 1000 / R_UI`. Notebook conductances in kJ/(h·K) are converted to displayed resistance using `R_UI = 3600/G_notebook`.

The application uses explicit Euler integration. Its stable step limit is recalculated from the network:

`dt_max = min(30 s, 0.88 × min_i(C_i / Σ_j G_ij))`.

In the challenge this limit is divided by 1.25 to cover the maximum wind enhancement. The sum includes every outgoing conductance, including those connected to prescribed boundary temperatures. Without heating, each updated value is a convex combination of previous temperatures and boundaries, ensuring the discrete maximum principle. Every internal branch contributes +q and −q, so internal exchange cannot create energy. Temperatures are never secretly clipped; only colours may saturate on a fixed display scale. Continuous heating without a thermostat can produce high temperatures.

The original notebook uses implicit trapezoidal integration, so the application's time discretisation differs. Chart and CSV history are recorded every five simulated minutes. At 10,000 records the history is thinned to limit memory use.

## Verification

Run `node test-model.cjs`; no external packages are required. It checks:

1. Agreement between RC derivatives and the saved K, F matrices after unit conversion.
2. All 36 fitted parameters, total C values, and aggregated spatial conductances.
3. Global energy balance in both simulation models.
4. Preservation of a uniform equilibrium.
5. Local heating followed by propagation; source weights summing to 1.
6. Daily periodicity and zero heater energy in Daily cycle mode.
7. Stability and the maximum principle at extreme positive R, C, and mixing settings.
8. Convergence when reducing the RC step. The verified maximum difference over one day between 30-second and 0.5-second steps is approximately 0.000396 °C.

Browser checks cover the interface, heating, daily fast-forward, switching the original model and initial states, changing C, and narrow/wide layouts. These are computational checks, not proof of the spatial extension's physical accuracy.

## Files and rebuilding

- `index.html`: interface; works through file://.
- `style.css`: responsive layout and visual styling.
- `engine.js`: independent thermal solver, fitted coefficients, and reference matrices.
- `challenge.js`: fixed scenario, sun trajectory, four room heaters, autopilot, and scoring.
- `app.js`: visualisation, controls, export, and import.
- `test-model.cjs`: original model checks.
- `test-challenge.cjs`: three-day challenge checks.
- `build.py`: rebuild the standalone HTML and source ZIP with `python3 build.py` from the application folder.
- `identified.json`: exported NPZ parameters and matrices for auditing.

There are no external dependencies or network requests. Deployment, network access, and server-side functionality are outside this application.

## Speed and sunset

The challenge runs four times faster than its first version: 2880 simulated seconds per real second, or 72 hours in approximately 90 seconds without pauses. Playback speed does not change the prescribed physical inputs or scoring. The third-day winter scenario is described above. Daily cycle and challenge modes share the continuous `sunTrackAt` visual trajectory, which spans all 24 hours and adapts to the scene's dimensions. The sun reaches the left edge of the scene and passes behind the ground horizon.
