<?php

function cm_template_custom_settings() {
  register_setting( 'wp-starter-settings-group', 'api_key');
  register_setting( 'wp-starter-settings-group', 'app_id');
  register_setting( 'wp-starter-settings-group', 'device_id');

  add_settings_section( 'wp-starter-options', NULL, 'cm_template_settings_options', 'cm_template_admin_menu_page');

  add_settings_field( 'cm-temlate-api', 'Api key', 'cm_temlate_api', 'cm_template_admin_menu_page', 'wp-starter-options');
  add_settings_field( 'cm-temlate-app', 'Application id', 'cm_temlate_app', 'cm_template_admin_menu_page', 'wp-starter-options');
  add_settings_field( 'cm-temlate-device', 'Device id', 'cm_temlate_device', 'cm_template_admin_menu_page', 'wp-starter-options');

  // Appearance Settings
  register_setting( 'cm-edit-appearance-settings-group', 'cm_template_bg_color');
  register_setting( 'cm-edit-appearance-settings-group', 'cm_template_primary_color');
  register_setting( 'cm-edit-appearance-settings-group', 'cm_template_secondary_color');

  add_settings_section( 'cm-edit-appearance-options', NULL, 'cm_edit_appearance_settings_options', 'cm_edit_appearance_page');

  add_settings_field( 'cm-edit-appearance-bg-color', 'Background Color', 'cm_edit_appearance_bg_color_callback', 'cm_edit_appearance_page', 'cm-edit-appearance-options');
  add_settings_field( 'cm-edit-appearance-primary-color', 'Primary Color', 'cm_edit_appearance_primary_color_callback', 'cm_edit_appearance_page', 'cm-edit-appearance-options');
  add_settings_field( 'cm-edit-appearance-secondary-color', 'Secondary Color', 'cm_edit_appearance_secondary_color_callback', 'cm_edit_appearance_page', 'cm-edit-appearance-options');

}
// Appearance Settings
function cm_edit_appearance_settings_options() {
  echo 'Custmize Your Appearance';
}

function cm_edit_appearance_bg_color_callback() {
  $bg_color = esc_attr(get_option('cm_template_bg_color'));
    echo '<input type="text" name="cm_template_bg_color" value="'.$bg_color.'" placeholder="Background Color" />';
}

function cm_edit_appearance_primary_color_callback() {
  $primary_color = esc_attr(get_option('cm_template_primary_color'));
    echo '<input type="text" name="cm_template_primary_color" value="'.$primary_color.'" placeholder="Primary Color" />';
}

function cm_edit_appearance_secondary_color_callback() {
  $secondary_color = esc_attr(get_option('cm_template_secondary_color'));
    echo '<input type="text" name="cm_template_secondary_color" value="'.$secondary_color.'" placeholder="Secondary Color" />';
}

// admin Settings


function cm_template_settings_options() {
  echo 'Customize Your Settings';
}


function cm_temlate_api() {
  $api_key = esc_attr(get_option('api_key'));
  echo '<input type="text" name="api_key" value="'.$api_key.'" placeholder="Api key" />';
}
function cm_temlate_app() {
  $app_id = esc_attr(get_option('app_id'));
  echo '<input type="text" name="app_id" value="'.$app_id.'" placeholder="App id" />';
}
function cm_temlate_device() {
  $device_id = esc_attr(get_option('device_id'));
  echo '<input type="text" name="device_id" value="'.$device_id.'" placeholder="Device id" />';
}

function cm_template_admin_menu_page() {
  ?>
      <h1>CM Admin Page</h1>
  <?php settings_errors(); ?>


  <form action="options.php" method="post">
    <?php settings_fields('wp-starter-settings-group'); ?>
    <?php do_settings_sections('cm_template_admin_menu_page'); ?>
    <?php submit_button(); ?>
  </form>
  <?php
}
function cm_template_register_endpoints() {
  register_rest_route( 'cmtemplate/v1', '/device', array(
    'methods' => 'GET',
    'callback' => 'get_wp_settings',
  ) );
}

add_action( 'rest_api_init', 'cm_template_register_endpoints');

function get_wp_settings($request) {
  return array(
    "apiKey" => get_option('api_key'),
    "appId" => get_option('app_id'),
    "deviceId" => get_option('device_id')
  );
}
