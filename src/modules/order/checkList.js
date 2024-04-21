const REGULAR_BEDROOM = [
  "admin_wiping_down_mirrors_and_frames",
  "admin_arranging_household_items",
  "admin_dusting_all_the_accessible_surfaces",
  "admin_removing_dust_from_all_accessible_lamps",
  "admin_making_the_bed",
  "admin_taking_out_garbage",
  "admin_vacuuming_or_sweeping_and_mopping_floors",
  "admin_washing_window_sills_switches_radiators_baseboards_handles_doors_doors_frame",
  "admin_removing_hair_from_the_couch_if_there_are_pets_in_the_house",
];

const REGULAR_KITCHEN = [
  "admin_washing_window_sills_switches_radiators_baseboards_handles_doors",
  "admin_washing_fronts_and_furniture",
  "admin_washing_kitchen_skinnels",
  "admin_washing_dirty_dishes_in_the_sink",
  "admin_mopping_the_floor",
  "admin_wiping_down_all_surfaces_refrigerator_hood_kitchen_appliances",
];

const REGULAR_CORRIDOR = [
  "admin_wiping_all_accessible_and_exposed_surfaces",
  "admin_cleaning_mirror",
  "admin_arrange_the_shoes_neatly",
  "admin_picking_up_all_the_trash",
  "admin_wiping_all_accessible_and_exposed",
  "admin_vacuuming_and_mopping_the_floor",
  "admin_wiping_down_mirrors_and_frames",
  "admin_washing_switches_radiators_baseboards_handles_doors",
];

const REGULAR_BATHROOM = [
  "admin_wiping_the_mirrors_and_glass_surfaces",
  "admin_cleaning_and_disinfecting_sink_toilet",
  "admin_cleaning_and_disinfecting_shower_and_bathtub",
  "admin_removing_slight_limescale",
  "admin_laying_things_out_neatly",
  "admin_mopping_the_floor",
];

const DEEP_CLEANING_BEDROOM = [
  ...REGULAR_BEDROOM,
  "admin_cleaning_the_interior_of_cabinets_from_dust",
];

const DEEP_CLEANING_KITCHEN = [
  ...REGULAR_KITCHEN,
  "admin_cleaning_the_fridge",
  "admin_cleaning_the_oven",
  "admin_cleaning_the_hood",
  "admin_cleaning_the_interior_of_cupboards",
];

const DEEP_CLEANING_CORRIDOR = [
  ...REGULAR_CORRIDOR,
  "admin_hanging_your_clothes_neatly",
  "admin_cleaning_interior_of_wardrobe_from_the_dust",
];

const DEEP_CLEANING_BATHROOM = [
  ...REGULAR_BATHROOM,
  "admin_laying_things_out_neatly",
  "admin_dusting_inside_cabinets",
];

const DEEP_CLEANING_BALCONY = [
  "admin_wiping_all_accessible_and_exposed_surfaces",
  "admin_cleaning_floors_and_railings",
  "admin_balcony_glass_from_inside",
];

const POST_CONSTRUCTION_BATHROOM = [
  "admin_we_eliminate_dust_on_all_surfaces_and_walls_excluding_the_ceiling",
  "admin_we_perform_a_wet_cleaning_of_the_floor_tile_mirrors",
  "admin_effectively_remove_stains_from_construction_mixtures",
  "admin_carry_out_the_collection_and_disposal_of_trash",
  "admin_clean_furniture_both_inside_and_outside",
];

const POST_CONSTRUCTION_KITCHEN = [
  "admin_washing_window_sills_switches_radiators_baseboards_handles_doors_doors_frame",
  "admin_wiping_down_all_surfaces_refrigerator_hood_kitchen_appliances",
  "admin_removing_traces_and_stains_from_building_mixtures",
  "admin_washing_fronts_and_furniture",
  "admin_dusting_inside_cabinets",
  "admin_picking_up_all_the_trash",
];

const POST_CONSTRUCTION_RESIDENTIAL_AREA = [
  "admin_we_conduct_a_thorough_cleaning_of_all_surfaces_and_walls_excluding_the_ceiling",
  "admin_we_perform_a_damp_mop_of_the_floor_windowsills_radiators_doors_and_baseboards",
  "admin_effectively_eliminate_traces_and_stains_from_construction_mixtures",
  "admin_collect_and_dispose_of_trash",
  "admin_washing_window_sills_switches_radiators_baseboards_handles_doors",
];

const WINDOWS = [
  "admin_check_the_glass_for_streaks_spots_or_dust",
  "admin_ensure_that_the_entire_glass_surface_is_evenly_cleaned",
  "admin_inspect_the_cleanliness_of_window_frames_and_sills",
  "admin_ensure_that_all_dirt_and_dust_have_been_removed",
  "admin_verify_that_there_are_no_traces_of_cleaning_solution_left_on_the_glass_and_frames",
  "admin_ensure_that_surfaces_have_dried_evenly",
  "admin_check_windows_for_stains_insect_marks_or_other_dirt",
  "admin_ensure_that_window_sashes_are_also_clean",
];

const OFFICE = ["admin_office_has_its_own_check_list"];

const OFFICE_RESIDENTIAL_AREA = [
  "admin_wiping_down_mirrors_and_frames",
  "admin_removing_dust_from_all_accessible_lamps",
  "admin_taking_out_garbage",
  "admin_vacuuming_or_sweeping_and_mopping_floors",
  "admin_washing_window_sills_switches_radiators_baseboards_handles_doors_doors_frame",
];

const OFFICE_KITCHEN = [...REGULAR_KITCHEN];
const OFFICE_BATHROOM = [...REGULAR_BATHROOM];

const DEEP_KITCHEN = [
  "admin_window",
  "admin_washing_window_sills_switches_radiators_baseboards_handles_doors",
  "admin_washing_fronts_and_furniture",
  "admin_washing_kitchen_skinnels",
  "admin_washing_dirty_dishes_in_the_sink",
  "admin_mopping_the_floor",
  "admin_wiping_down_all_surfaces_refrigerator_hood_kitchen_appliances",
  "admin_cleaning_the_fridge",
  "admin_cleaning_the_oven",
  "admin_cleaning_the_hood",
  "admin_cleaning_the_interior_of_cupboards",
];

const CUSTOM_CLEANING_ADDITIONAL_MAIN_SERVICES_TITLES = {
  ROOM: "Clean the room_summery",
  BATHROOM: "Clean the bathroom_summery",
  KITCHEN: "Clean the kitchen_summery",
  CORRIDOR: "Clean the corridor_summery",
  CLOAK: "Clean the cloak room_summery",
  WINDOW: "Wash the window_summery",
  BALCONY: "Balcony_summery",
};

const CUSTOM_CLOAK_ROOM = [
  "admin_wiping_all_accessible_and_exposed_surfaces",
  "admin_arrange_the_shoes_neatly",
  "admin_picking_up_all_the_trash",
  "admin_vacuuming_and_mopping_the_floor",
];

const CUSTOM_BEDROOM = [...REGULAR_BEDROOM];
const CUSTOM_KITCHEN = [...REGULAR_KITCHEN];
const CUSTOM_BATHROOM = [...REGULAR_BATHROOM];
const CUSTOM_BALCONY = [...DEEP_CLEANING_BALCONY];
const CUSTOM_WINDOWS = [...WINDOWS];

const WHILE_SICK = [
  "admin_preventive_disinfection_treatment_to_surfaces",
  "admin_changing_bedsheets",
  "admin_taking_away_trash",
  "admin_cleaning_and_disinfecting_sink_toilet",
  "admin_washing_dirty_dishes",
  "admin_air_ventilation",
];

module.exports = {
  REGULAR_BEDROOM,
  REGULAR_KITCHEN,
  REGULAR_CORRIDOR,
  REGULAR_BATHROOM,
  DEEP_CLEANING_BEDROOM,
  DEEP_CLEANING_KITCHEN,
  DEEP_CLEANING_CORRIDOR,
  DEEP_CLEANING_BATHROOM,
  DEEP_CLEANING_BALCONY,
  POST_CONSTRUCTION_BATHROOM,
  POST_CONSTRUCTION_KITCHEN,
  POST_CONSTRUCTION_RESIDENTIAL_AREA,
  WINDOWS,
  OFFICE,
  OFFICE_RESIDENTIAL_AREA,
  OFFICE_KITCHEN,
  OFFICE_BATHROOM,
  DEEP_KITCHEN,
  CUSTOM_CLEANING_ADDITIONAL_MAIN_SERVICES_TITLES,
  CUSTOM_CLOAK_ROOM,
  CUSTOM_BEDROOM,
  CUSTOM_KITCHEN,
  CUSTOM_BATHROOM,
  CUSTOM_BALCONY,
  CUSTOM_WINDOWS,
  WHILE_SICK,
};
