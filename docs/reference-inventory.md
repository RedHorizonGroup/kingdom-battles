# Kingdom Battles reference inventory

This inventory is the honest application record for the available Kingdom Battles references. The implementation uses the recovered family names and visual language; it does not claim to embed an unavailable original bitmap.

| Reference / drawing cue | Applied in | Verification cue |
| --- | --- | --- |
| Barracks / infantry house | Barracks card, `icon-barracks`, Scout doctrine | Buy Barracks; Scout becomes unlocked |
| Fletchery / ranged house | Fletchery card, `icon-fletchery`, Archer doctrine | Requires Barracks + Fletchery |
| Mansion / boss house | Mansion card, `icon-mansion`, Boss doctrine | Requires Barracks + Mansion |
| Stables / cavalry house | Stables card, `icon-stables`, Cavalry doctrine | Requires Barracks + Stables |
| Mage Tower / star tower | Mage Tower card, `icon-mage`, Wizard doctrine | Requires Fletchery + Mage Tower |
| Cave / heavy refuge | Cave card, `icon-cave`, Troll doctrine | Requires Mansion + Cave |
| Factory / siege works | Factory card, `icon-factory`, Catapult doctrine | Requires Mansion + Stables + Factory |
| Mountaintop Cave / peak | Mountaintop Cave card, `icon-mountain`, Dragon doctrine | Requires Mage Tower + Cave + Mountaintop Cave |
| Workshop / ram shop | Workshop card, `icon-workshop`, Ram doctrine | Requires Barracks + Workshop |
| Alchemist Shop / flask | Alchemist Shop card, `icon-alchemist`, Bomber doctrine | Requires Fletchery + Workshop + Alchemist Shop |
| Iron Works / forge | Iron Works card, `icon-iron`, Cannon doctrine | Requires Factory + Iron Works |
| Blacksmith / crossed tools | Blacksmith card, `icon-blacksmith`, deployed power bonus | Requires Stables + Workshop |
| Hall of Fame / heraldic hall | Hall of Fame card, `icon-hall`, renown reward | Requires Mansion + Blacksmith |
| Pit to Hell / gate | Pit to Hell card, `icon-pit`, Infernal doctrine | Requires Cave + Alchemist Shop + Pit to Hell |
| Gateway to Heaven / arch | Gateway to Heaven card, `icon-gateway`, capstone route | Requires Mountaintop Cave + Hall of Fame |

## Asset boundary

Only the references available in the task worktree and the recorded brief are used. The game renders original inline SVG symbols and CSS illustration rather than copying a historical runtime. Any future supplied image should be added to this table with its exact path and a browser-visible application before it is treated as covered.
