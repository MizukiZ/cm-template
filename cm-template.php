<?php
/*
Plugin Name: cm-template
Description: Template_Plugin.
Version:     0.0.1
Author:      @nisalvd, @mizukiZ, @JazzHutchy
Author URI: github.com/nisalvd
*/

//#### Settings Page

function cm_template_admin_menu() {
  add_menu_page(
    "CM Admin Page", // Page Title
    "CM Admin Menu", // Menu Title
    "manage_options",
    "cm_template_admin_menu", // Menu Slug(url)
    "cm_template_admin_menu_page" // Callback Function
  );

  //Activate custom settings
  add_action('admin_init', 'cm_template_custom_settings');
}
add_action("admin_menu", "cm_template_admin_menu");

function cm_template_custom_settings() {
  register_setting( 'wp-starter-settings-group', 'api_key');
  register_setting( 'wp-starter-settings-group', 'app_id');
  register_setting( 'wp-starter-settings-group', 'device_id');

  add_settings_section( 'wp-starter-options', NULL, 'cm_template_settings_options', 'cm_template_admin_menu_page');

  add_settings_field( 'cm-temlate-api', 'Api key', 'cm_temlate_api', 'cm_template_admin_menu_page', 'wp-starter-options');
  add_settings_field( 'cm-temlate-app', 'Application id', 'cm_temlate_app', 'cm_template_admin_menu_page', 'wp-starter-options');
  add_settings_field( 'cm-temlate-device', 'Device id', 'cm_temlate_device', 'cm_template_admin_menu_page', 'wp-starter-options');
}

function cm_template_settings_options() {
  echo 'Customize Your Settings';
}


function cm_temlate_api() {
  $api_key = esc_attr(get_option('api_key'));
  echo '<input type="text" name="api_key" value="'.$api_key.'" placeholder="Api key" />';
}
function cm_temlate_app() {
  $app_id = esc_attr(get_option('app_id'));
  echo '<input type="text" name="app_id" value="'.$app_id.'" placeholder="Device id" />';
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

// ############Including compiled js and css files
function wp_react_hello_world() {
  echo '<div id="root"></div>';
}

function include_react_files() {
  wp_enqueue_style('prefix-style', plugin_dir_url( __FILE__ ) . 'dist/style.bundle.css', array(), '0.0.1', 'all' );
  wp_enqueue_script('plugin-scripts', plugin_dir_url( __FILE__ ) . 'dist/bundle.js', array(), '0.0.1', 'all' );

  wp_localize_script('plugin-scripts','wp_home_url', array(
      "base_url" => home_url()
  ));
}

// change this later to be compiled automatically with webpack
function actionhero_js() {
  $url = plugin_dir_url(__FILE__). 'dist/actionheroClient.min.js';
  echo '<script type="text/javascript" src= '.$url.' ></script>';
}

add_action('wp_head', 'actionhero_js');
add_action( 'wp_enqueue_scripts', 'include_react_files' );