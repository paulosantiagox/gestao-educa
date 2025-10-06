<?php
/**
 * Plugin Name: EJA Tracking System
 * Plugin URI: https://ejaeducabrasil.com
 * Description: Sistema de tracking avançado para análise de comportamento dos usuários no site.
 * Version: 1.0.0
 * Author: EJA Educa Brasil
 * License: GPL v2 or later
 */

// Prevenir acesso direto
if (!defined('ABSPATH')) {
    exit;
}

class EJATrackingPlugin {
    
    private $plugin_name = 'eja-tracking';
    private $version = '1.0.0';
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_tracking_script'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'settings_init'));
        
        // Hook para adicionar o script no head
        add_action('wp_head', array($this, 'add_tracking_script'), 1);
        
        // Ativação e desativação
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    public function init() {
        // Inicialização do plugin
    }
    
    public function activate() {
        // Configurações padrão
        add_option('eja_tracking_enabled', true);
        add_option('eja_tracking_api_url', 'https://gestao-educa.autoflixtreinamentos.com/api/tracking');
        add_option('eja_tracking_domain', get_site_url());
    }
    
    public function deactivate() {
        // Limpeza se necessário
    }
    
    public function enqueue_tracking_script() {
        if (get_option('eja_tracking_enabled', true)) {
            wp_enqueue_script(
                $this->plugin_name,
                plugin_dir_url(__FILE__) . 'assets/tracking-script.js',
                array(),
                $this->version,
                false // Carregar no head para capturar todos os eventos
            );
            
            // Passar configurações para o JavaScript
            wp_localize_script($this->plugin_name, 'eja_tracking_config', array(
                'api_url' => get_option('eja_tracking_api_url', 'https://gestao-educa.autoflixtreinamentos.com/api/tracking'),
                'domain' => parse_url(get_site_url(), PHP_URL_HOST),
                'debug' => WP_DEBUG
            ));
        }
    }
    
    public function add_tracking_script() {
        if (!get_option('eja_tracking_enabled', true)) {
            return;
        }
        
        $api_url = get_option('eja_tracking_api_url', 'https://gestao-educa.autoflixtreinamentos.com/api/tracking');
        $domain = parse_url(get_site_url(), PHP_URL_HOST);
        
        ?>
        <script type="text/javascript">
        // Configuração do EJA Tracking
        window.EJA_TRACKING_CONFIG = {
            API_BASE_URL: '<?php echo esc_js($api_url); ?>',
            DOMAIN: '<?php echo esc_js($domain); ?>',
            SESSION_DURATION: 30 * 60 * 1000,
            HEARTBEAT_INTERVAL: 30 * 1000,
            SCROLL_THRESHOLD: 5,
            TIME_THRESHOLD: 5,
            DEBUG: <?php echo WP_DEBUG ? 'true' : 'false'; ?>
        };
        </script>
        <?php
        
        // Incluir o script de tracking inline para garantir carregamento
        $script_path = plugin_dir_path(__FILE__) . 'assets/tracking-script-inline.js';
        if (file_exists($script_path)) {
            echo '<script type="text/javascript">';
            include $script_path;
            echo '</script>';
        }
    }
    
    // ==========================================
    // PAINEL ADMINISTRATIVO
    // ==========================================
    
    public function add_admin_menu() {
        add_options_page(
            'EJA Tracking',
            'EJA Tracking',
            'manage_options',
            'eja-tracking',
            array($this, 'admin_page')
        );
    }
    
    public function settings_init() {
        register_setting('eja_tracking_settings', 'eja_tracking_enabled');
        register_setting('eja_tracking_settings', 'eja_tracking_api_url');
        register_setting('eja_tracking_settings', 'eja_tracking_domain');
        register_setting('eja_tracking_settings', 'eja_tracking_exclude_admins');
        register_setting('eja_tracking_settings', 'eja_tracking_exclude_pages');
        
        add_settings_section(
            'eja_tracking_section',
            'Configurações do Sistema de Tracking',
            array($this, 'settings_section_callback'),
            'eja_tracking_settings'
        );
        
        add_settings_field(
            'eja_tracking_enabled',
            'Ativar Tracking',
            array($this, 'enabled_field_callback'),
            'eja_tracking_settings',
            'eja_tracking_section'
        );
        
        add_settings_field(
            'eja_tracking_api_url',
            'URL da API',
            array($this, 'api_url_field_callback'),
            'eja_tracking_settings',
            'eja_tracking_section'
        );
        
        add_settings_field(
            'eja_tracking_exclude_admins',
            'Excluir Administradores',
            array($this, 'exclude_admins_field_callback'),
            'eja_tracking_settings',
            'eja_tracking_section'
        );
        
        add_settings_field(
            'eja_tracking_exclude_pages',
            'Páginas Excluídas',
            array($this, 'exclude_pages_field_callback'),
            'eja_tracking_settings',
            'eja_tracking_section'
        );
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>EJA Tracking System</h1>
            
            <div class="notice notice-info">
                <p><strong>Sistema de Tracking Ativo!</strong> Os dados estão sendo coletados e enviados para análise.</p>
            </div>
            
            <form action="options.php" method="post">
                <?php
                settings_fields('eja_tracking_settings');
                do_settings_sections('eja_tracking_settings');
                submit_button();
                ?>
            </form>
            
            <div class="card">
                <h2>Estatísticas Rápidas</h2>
                <p>Para ver estatísticas detalhadas, acesse o <a href="<?php echo get_option('eja_tracking_api_url', ''); ?>" target="_blank">painel de controle</a>.</p>
                
                <h3>Como usar o tracking manual:</h3>
                <pre><code>// Rastrear evento personalizado
EJATracking.trackEvent({
    event_name: 'download',
    event_category: 'engagement',
    event_action: 'click',
    event_label: 'ebook_matematica',
    event_value: 1
});

// Rastrear interação personalizada
EJATracking.trackInteraction({
    interaction_type: 'video_play',
    element_type: 'video',
    element_text: 'Aula de Matemática'
});</code></pre>
            </div>
            
            <div class="card">
                <h2>Instalação Manual</h2>
                <p>Se preferir instalar o script manualmente, adicione este código no <code>&lt;head&gt;</code> do seu tema:</p>
                <textarea readonly style="width: 100%; height: 100px;">&lt;script src="<?php echo plugin_dir_url(__FILE__); ?>assets/tracking-script.js">&lt;/script></textarea>
            </div>
        </div>
        
        <style>
        .card {
            background: #fff;
            border: 1px solid #ccd0d4;
            border-radius: 4px;
            padding: 20px;
            margin: 20px 0;
        }
        .card h2, .card h3 {
            margin-top: 0;
        }
        pre {
            background: #f6f7f7;
            border: 1px solid #ddd;
            border-radius: 3px;
            padding: 10px;
            overflow-x: auto;
        }
        </style>
        <?php
    }
    
    public function settings_section_callback() {
        echo '<p>Configure o sistema de tracking para análise de comportamento dos usuários.</p>';
    }
    
    public function enabled_field_callback() {
        $enabled = get_option('eja_tracking_enabled', true);
        echo '<input type="checkbox" name="eja_tracking_enabled" value="1" ' . checked(1, $enabled, false) . ' />';
        echo '<p class="description">Ativar ou desativar o sistema de tracking.</p>';
    }
    
    public function api_url_field_callback() {
        $api_url = get_option('eja_tracking_api_url', 'https://gestao-educa.autoflixtreinamentos.com/api/tracking');
        echo '<input type="url" name="eja_tracking_api_url" value="' . esc_attr($api_url) . '" class="regular-text" />';
        echo '<p class="description">URL da API do sistema de tracking.</p>';
    }
    
    public function exclude_admins_field_callback() {
        $exclude = get_option('eja_tracking_exclude_admins', false);
        echo '<input type="checkbox" name="eja_tracking_exclude_admins" value="1" ' . checked(1, $exclude, false) . ' />';
        echo '<p class="description">Não rastrear usuários administradores.</p>';
    }
    
    public function exclude_pages_field_callback() {
        $pages = get_option('eja_tracking_exclude_pages', '');
        echo '<textarea name="eja_tracking_exclude_pages" rows="3" class="large-text">' . esc_textarea($pages) . '</textarea>';
        echo '<p class="description">URLs ou caminhos de páginas para excluir do tracking (uma por linha).</p>';
    }
    
    // ==========================================
    // FUNÇÕES AUXILIARES
    // ==========================================
    
    public function should_track() {
        // Verificar se está ativado
        if (!get_option('eja_tracking_enabled', true)) {
            return false;
        }
        
        // Verificar se deve excluir admins
        if (get_option('eja_tracking_exclude_admins', false) && current_user_can('administrator')) {
            return false;
        }
        
        // Verificar páginas excluídas
        $excluded_pages = get_option('eja_tracking_exclude_pages', '');
        if (!empty($excluded_pages)) {
            $current_url = $_SERVER['REQUEST_URI'];
            $excluded_list = explode("\n", $excluded_pages);
            
            foreach ($excluded_list as $excluded) {
                $excluded = trim($excluded);
                if (!empty($excluded) && strpos($current_url, $excluded) !== false) {
                    return false;
                }
            }
        }
        
        return true;
    }
}

// Inicializar o plugin
new EJATrackingPlugin();

// ==========================================
// FUNÇÕES GLOBAIS PARA DESENVOLVEDORES
// ==========================================

/**
 * Rastrear evento personalizado
 */
function eja_track_event($event_name, $category = '', $action = '', $label = '', $value = null) {
    ?>
    <script>
    if (typeof EJATracking !== 'undefined') {
        EJATracking.trackEvent({
            event_name: '<?php echo esc_js($event_name); ?>',
            event_category: '<?php echo esc_js($category); ?>',
            event_action: '<?php echo esc_js($action); ?>',
            event_label: '<?php echo esc_js($label); ?>',
            event_value: <?php echo is_numeric($value) ? $value : 'null'; ?>
        });
    }
    </script>
    <?php
}

/**
 * Rastrear conversão
 */
function eja_track_conversion($type, $value = null, $data = array()) {
    ?>
    <script>
    if (typeof EJATracking !== 'undefined') {
        EJATracking.trackEvent({
            event_name: 'conversion',
            event_category: 'conversion',
            event_action: '<?php echo esc_js($type); ?>',
            event_value: <?php echo is_numeric($value) ? $value : 'null'; ?>,
            custom_data: <?php echo json_encode($data); ?>
        });
    }
    </script>
    <?php
}

/**
 * Shortcode para tracking manual
 */
function eja_tracking_shortcode($atts) {
    $atts = shortcode_atts(array(
        'event' => '',
        'category' => '',
        'action' => '',
        'label' => '',
        'value' => null
    ), $atts);
    
    if (!empty($atts['event'])) {
        ob_start();
        eja_track_event($atts['event'], $atts['category'], $atts['action'], $atts['label'], $atts['value']);
        return ob_get_clean();
    }
    
    return '';
}
add_shortcode('eja_track', 'eja_tracking_shortcode');

?>