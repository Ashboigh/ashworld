<?php
declare(strict_types=1);

$pluginDir = getenv('AMALENA_PLUGIN_PATH') ?: 'C:\\xampp\\htdocs\\customer_report\\wordpress-plugin';
define('ABSPATH', '/');
require_once $pluginDir . '/admin/includes/conversation-flows.php';

$flow = Amalena_Conversation_Flows::get_default_flow();
echo json_encode($flow, JSON_UNESCAPED_SLASHES);
