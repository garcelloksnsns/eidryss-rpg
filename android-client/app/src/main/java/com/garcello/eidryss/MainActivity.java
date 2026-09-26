package com.garcello.eidryss;

import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Eidryss Android shell.
 *
 * O APK cuida da experiência nativa (splash, conexão, manutenção, cache e botão
 * voltar). A interface de jogo é entregue pelo servidor do Host. Assim, quase
 * todas as atualizações do RPG podem chegar sem reinstalar o APK.
 */
public final class MainActivity extends Activity {
    private static final String PREFS = "eidryss_client";
    private static final String PREF_SERVER = "server_url";
    private static final String PREF_REVISION = "client_revision";
    private static final long RETRY_MS = 5_000L;

    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService network = Executors.newSingleThreadExecutor();

    private SharedPreferences prefs;
    private FrameLayout root;
    private WebView webView;
    private LinearLayout overlay;
    private SigilView sigil;
    private TextView eyebrow;
    private TextView title;
    private TextView message;
    private TextView footer;
    private EditText serverInput;
    private Button primary;
    private Button secondary;
    private Runnable retryTask;
    private String activeServer = "";
    private boolean webReady = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        window.setStatusBarColor(Color.rgb(8, 10, 18));
        window.setNavigationBarColor(Color.rgb(8, 10, 18));

        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        buildUi();
        configureWebView();

        String saved = prefs.getString(PREF_SERVER, "");
        if (saved == null || saved.isBlank()) showServerSetup("");
        else connectToServer(saved, false);
    }

    private void buildUi() {
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(8, 10, 18));
        setContentView(root);

        webView = new WebView(this);
        webView.setVisibility(View.INVISIBLE);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        overlay = new LinearLayout(this);
        overlay.setOrientation(LinearLayout.VERTICAL);
        overlay.setGravity(Gravity.CENTER_HORIZONTAL);
        overlay.setPadding(dp(28), dp(24), dp(28), dp(24));
        GradientDrawable overlayBg = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{Color.rgb(8, 10, 18), Color.rgb(11, 12, 25), Color.rgb(8, 10, 18)});
        overlay.setBackground(overlayBg);
        root.addView(overlay, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        SpaceView topSpace = new SpaceView(this);
        overlay.addView(topSpace, new LinearLayout.LayoutParams(1, 0, 1f));

        sigil = new SigilView(this);
        overlay.addView(sigil, new LinearLayout.LayoutParams(dp(142), dp(142)));

        eyebrow = makeText("EIDRYSS // CLIENTE", 11, 0xFF9A8CFF, true);
        LinearLayout.LayoutParams eyebrowParams = wrap();
        eyebrowParams.topMargin = dp(24);
        overlay.addView(eyebrow, eyebrowParams);

        title = makeText("Sincronizando o mundo", 29, 0xFFF4F5FF, true);
        title.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleParams = wrap();
        titleParams.topMargin = dp(10);
        overlay.addView(title, titleParams);

        message = makeText("Conectando ao servidor do Host…", 15, 0xFFABB0C8, false);
        message.setGravity(Gravity.CENTER);
        message.setMaxWidth(dp(390));
        LinearLayout.LayoutParams msgParams = wrap();
        msgParams.topMargin = dp(12);
        overlay.addView(message, msgParams);

        serverInput = new EditText(this);
        serverInput.setSingleLine(true);
        serverInput.setTextColor(0xFFF4F5FF);
        serverInput.setHintTextColor(0xFF777C96);
        serverInput.setTextSize(14);
        serverInput.setHint("https://seu-servidor.trycloudflare.com");
        serverInput.setPadding(dp(16), 0, dp(16), 0);
        serverInput.setBackground(roundRect(0xFF121526, 0x339A8CFF, 16));
        LinearLayout.LayoutParams inputParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(54));
        inputParams.setMargins(0, dp(22), 0, 0);
        serverInput.setLayoutParams(inputParams);
        serverInput.setVisibility(View.GONE);
        overlay.addView(serverInput);

        primary = makeButton("Tentar novamente", true);
        LinearLayout.LayoutParams primaryParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(52));
        primaryParams.setMargins(0, dp(22), 0, 0);
        overlay.addView(primary, primaryParams);

        secondary = makeButton("Trocar servidor", false);
        LinearLayout.LayoutParams secondaryParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(48));
        secondaryParams.setMargins(0, dp(10), 0, 0);
        overlay.addView(secondary, secondaryParams);

        footer = makeText("APK 1.0 · interface atualizável pelo servidor", 11, 0xFF686D84, false);
        footer.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams footerParams = wrap();
        footerParams.topMargin = dp(18);
        overlay.addView(footer, footerParams);

        SpaceView bottomSpace = new SpaceView(this);
        overlay.addView(bottomSpace, new LinearLayout.LayoutParams(1, 0, 1f));
    }

    @SuppressWarnings("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " EidryssAndroid/1.0");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setBackgroundColor(Color.rgb(8, 10, 18));
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri target = request.getUrl();
                if (sameOrigin(target, activeServer)) return false;
                openExternal(target);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                webReady = true;
                webView.setVisibility(View.VISIBLE);
                overlay.setVisibility(View.GONE);
                sigil.stop();
            }
        });
    }

    private void connectToServer(String raw, boolean userInitiated) {
        cancelRetry();
        String normalized = normalizeServer(raw);
        if (normalized == null) {
            showServerSetup("Digite um endereço HTTP ou HTTPS válido.");
            return;
        }
        activeServer = normalized;
        if (userInitiated) prefs.edit().putString(PREF_SERVER, normalized).apply();
        showLoading("Abrindo o portal", "Validando servidor e versão do mundo…");
        fetchMeta(normalized, false);
    }

    private void fetchMeta(String server, boolean fromRetry) {
        network.execute(() -> {
            MetaResult result;
            try {
                URL url = new URL(server + "/api/client/meta?_=" + System.currentTimeMillis());
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(6_000);
                connection.setReadTimeout(6_000);
                connection.setUseCaches(false);
                connection.setRequestProperty("Accept", "application/json");
                connection.setRequestProperty("User-Agent", "EidryssAndroid/1.0");
                int status = connection.getResponseCode();
                InputStream stream = status >= 200 && status < 400
                        ? connection.getInputStream() : connection.getErrorStream();
                String body = readAll(stream);
                if (status < 200 || status >= 400) throw new IllegalStateException("HTTP " + status);
                JSONObject json = new JSONObject(body);
                result = new MetaResult(
                        json.optBoolean("maintenance", false),
                        json.optString("message", "O mundo está em manutenção."),
                        json.optInt("clientRevision", 0),
                        json.optString("version", ""));
            } catch (Exception error) {
                result = new MetaResult(false, error.getClass().getSimpleName() + ": " + safeMessage(error), -1, "");
            }
            MetaResult finalResult = result;
            main.post(() -> handleMeta(server, finalResult, fromRetry));
        });
    }

    private void handleMeta(String server, MetaResult meta, boolean fromRetry) {
        if (!server.equals(activeServer)) return;
        if (meta.revision < 0) {
            showOffline(meta.message);
            scheduleRetry(server);
            return;
        }

        if (meta.maintenance) {
            showMaintenance(meta.message, meta.version);
            scheduleRetry(server);
            return;
        }

        int previousRevision = prefs.getInt(PREF_REVISION, -1);
        if (meta.revision > 0 && previousRevision != meta.revision) {
            webView.clearCache(true);
            webView.clearHistory();
            prefs.edit().putInt(PREF_REVISION, meta.revision).apply();
        }

        prefs.edit().putString(PREF_SERVER, server).apply();
        if (fromRetry || !webReady || !server.equals(baseOf(webView.getUrl()))) {
            showLoading("Entrando em Eidryss", "Sincronizando interface " +
                    (meta.version.isBlank() ? "mais recente" : meta.version) + "…");
            webView.loadUrl(server + "/?client=android&rev=" + Math.max(0, meta.revision));
        } else {
            overlay.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
        }
    }

    private void showServerSetup(String warning) {
        cancelRetry();
        webReady = false;
        webView.setVisibility(View.INVISIBLE);
        overlay.setVisibility(View.VISIBLE);
        sigil.start();
        eyebrow.setText("EIDRYSS // PRIMEIRA CONEXÃO");
        title.setText("Conecte seu mundo");
        message.setText(warning == null || warning.isBlank()
                ? "Cole o endereço HTTPS gerado pelo servidor no Termux. Ele ficará salvo neste aparelho."
                : warning);
        serverInput.setText(activeServer.isBlank() ? prefs.getString(PREF_SERVER, "") : activeServer);
        serverInput.setVisibility(View.VISIBLE);
        primary.setText("Conectar");
        primary.setVisibility(View.VISIBLE);
        primary.setOnClickListener(v -> connectToServer(serverInput.getText().toString(), true));
        secondary.setVisibility(View.GONE);
        footer.setText("O jogo roda no seu servidor · este APK é o cliente");
    }

    private void showLoading(String heading, String detail) {
        overlay.setVisibility(View.VISIBLE);
        webView.setVisibility(View.INVISIBLE);
        sigil.start();
        eyebrow.setText("EIDRYSS // SINCRONIZAÇÃO");
        title.setText(heading);
        message.setText(detail);
        serverInput.setVisibility(View.GONE);
        primary.setVisibility(View.GONE);
        secondary.setVisibility(View.GONE);
        footer.setText("A interface pode atualizar sem reinstalar o APK");
    }

    private void showMaintenance(String detail, String version) {
        overlay.setVisibility(View.VISIBLE);
        webView.setVisibility(View.INVISIBLE);
        sigil.start();
        eyebrow.setText("EIDRYSS // MANUTENÇÃO");
        title.setText("O mundo está sendo reforjado");
        message.setText(detail == null || detail.isBlank()
                ? "O Host está aplicando uma atualização. Sua sessão e campanha permanecem salvas."
                : detail);
        serverInput.setVisibility(View.GONE);
        primary.setText("Verificar agora");
        primary.setVisibility(View.VISIBLE);
        primary.setOnClickListener(v -> fetchMeta(activeServer, true));
        secondary.setText("Trocar servidor");
        secondary.setVisibility(View.VISIBLE);
        secondary.setOnClickListener(v -> showServerSetup(""));
        footer.setText((version == null || version.isBlank() ? "" : "Servidor " + version + " · ") + "checando a cada 5 s");
    }

    private void showOffline(String detail) {
        overlay.setVisibility(View.VISIBLE);
        webView.setVisibility(View.INVISIBLE);
        sigil.start();
        eyebrow.setText("EIDRYSS // SERVIDOR INDISPONÍVEL");
        title.setText("O portal não respondeu");
        message.setText("O Termux pode estar fechado, reiniciando ou sem túnel.\n\n" + detail);
        serverInput.setVisibility(View.GONE);
        primary.setText("Tentar novamente");
        primary.setVisibility(View.VISIBLE);
        primary.setOnClickListener(v -> fetchMeta(activeServer, true));
        secondary.setText("Trocar endereço");
        secondary.setVisibility(View.VISIBLE);
        secondary.setOnClickListener(v -> showServerSetup(""));
        footer.setText("Tentativa automática em 5 s");
    }

    private void scheduleRetry(String server) {
        cancelRetry();
        retryTask = () -> {
            if (server.equals(activeServer)) fetchMeta(server, true);
        };
        main.postDelayed(retryTask, RETRY_MS);
    }

    private void cancelRetry() {
        if (retryTask != null) main.removeCallbacks(retryTask);
        retryTask = null;
    }

    private boolean sameOrigin(Uri target, String base) {
        if (target == null || base == null || base.isBlank()) return false;
        try {
            URI a = new URI(base);
            String scheme = target.getScheme();
            String host = target.getHost();
            int targetPort = target.getPort() == -1 ? defaultPort(scheme) : target.getPort();
            int basePort = a.getPort() == -1 ? defaultPort(a.getScheme()) : a.getPort();
            return eq(scheme, a.getScheme()) && eq(host, a.getHost()) && targetPort == basePort;
        } catch (Exception ignored) {
            return false;
        }
    }

    private String normalizeServer(String raw) {
        try {
            String value = raw == null ? "" : raw.trim();
            if (!value.contains("://")) value = "https://" + value;
            while (value.endsWith("/")) value = value.substring(0, value.length() - 1);
            URI uri = new URI(value);
            if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))) return null;
            if (uri.getHost() == null || uri.getHost().isBlank() || uri.getUserInfo() != null) return null;
            return uri.toString();
        } catch (Exception ignored) {
            return null;
        }
    }

    private String baseOf(String url) {
        try {
            if (url == null) return "";
            URI uri = new URI(url);
            return new URI(uri.getScheme(), null, uri.getHost(), uri.getPort(), null, null, null).toString();
        } catch (Exception ignored) {
            return "";
        }
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
            // Sem navegador externo: permanece no cliente.
        }
    }

    private static String readAll(InputStream stream) throws Exception {
        if (stream == null) return "";
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            StringBuilder out = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) out.append(line);
            return out.toString();
        }
    }

    private static String safeMessage(Exception error) {
        String value = error.getMessage();
        if (value == null || value.isBlank()) return "sem resposta";
        return value.length() > 160 ? value.substring(0, 160) : value;
    }

    private static boolean eq(String a, String b) {
        return a != null && b != null && a.equalsIgnoreCase(b);
    }

    private static int defaultPort(String scheme) {
        return "https".equalsIgnoreCase(scheme) ? 443 : 80;
    }

    private TextView makeText(String value, int size, int color, boolean bold) {
        TextView text = new TextView(this);
        text.setText(value);
        text.setTextSize(size);
        text.setTextColor(color);
        text.setLineSpacing(0, 1.12f);
        if (bold) text.setTypeface(text.getTypeface(), android.graphics.Typeface.BOLD);
        return text;
    }

    private Button makeButton(String value, boolean primaryStyle) {
        Button button = new Button(this);
        button.setAllCaps(false);
        button.setText(value);
        button.setTextSize(14);
        button.setTypeface(button.getTypeface(), android.graphics.Typeface.BOLD);
        button.setTextColor(primaryStyle ? 0xFF0B0B15 : 0xFFE9E9F5);
        button.setBackground(roundRect(primaryStyle ? 0xFFE2C77E : 0xFF171A2B,
                primaryStyle ? 0x00FFFFFF : 0x339A8CFF, 16));
        return button;
    }

    private GradientDrawable roundRect(int fill, int stroke, int radiusDp) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(radiusDp));
        if ((stroke >>> 24) != 0) drawable.setStroke(dp(1), stroke);
        return drawable;
    }

    private LinearLayout.LayoutParams wrap() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onBackPressed() {
        if (overlay.getVisibility() == View.VISIBLE) {
            if (!activeServer.isBlank() && serverInput.getVisibility() == View.VISIBLE) {
                connectToServer(activeServer, false);
                return;
            }
        } else if (webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        cancelRetry();
        network.shutdownNow();
        sigil.stop();
        webView.destroy();
        super.onDestroy();
    }

    private record MetaResult(boolean maintenance, String message, int revision, String version) {}

    private static final class SpaceView extends View {
        SpaceView(Activity context) { super(context); }
    }

    /** Símbolo vetorial animado desenhado nativamente no Android. */
    private static final class SigilView extends View {
        private final Paint line = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint glow = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint core = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Path diamond = new Path();
        private ValueAnimator animator;
        private float phase = 0f;

        SigilView(Activity context) {
            super(context);
            line.setStyle(Paint.Style.STROKE);
            line.setStrokeCap(Paint.Cap.ROUND);
            glow.setStyle(Paint.Style.STROKE);
            core.setStyle(Paint.Style.FILL);
            setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        }

        void start() {
            if (animator != null && animator.isRunning()) return;
            animator = ValueAnimator.ofFloat(0f, 360f);
            animator.setDuration(6_400L);
            animator.setRepeatCount(ValueAnimator.INFINITE);
            animator.setInterpolator(null);
            animator.addUpdateListener(a -> {
                phase = (float) a.getAnimatedValue();
                invalidate();
            });
            animator.start();
        }

        void stop() {
            if (animator != null) animator.cancel();
            animator = null;
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            float w = getWidth();
            float h = getHeight();
            float cx = w / 2f;
            float cy = h / 2f;
            float radius = Math.min(w, h) * .38f;

            glow.setStrokeWidth(radius * .17f);
            glow.setColor(0x229A8CFF);
            glow.setShadowLayer(radius * .24f, 0, 0, 0x669A8CFF);
            canvas.drawCircle(cx, cy, radius * .72f, glow);

            canvas.save();
            canvas.rotate(phase, cx, cy);
            line.setStrokeWidth(Math.max(2f, radius * .028f));
            line.setColor(0xFFE8C77C);
            RectF outer = new RectF(cx - radius, cy - radius, cx + radius, cy + radius);
            canvas.drawArc(outer, 18, 92, false, line);
            canvas.drawArc(outer, 198, 92, false, line);
            canvas.restore();

            canvas.save();
            canvas.rotate(-phase * .72f, cx, cy);
            line.setColor(0xFF9A8CFF);
            RectF inner = new RectF(cx - radius * .73f, cy - radius * .73f,
                    cx + radius * .73f, cy + radius * .73f);
            canvas.drawArc(inner, 0, 130, false, line);
            canvas.drawArc(inner, 180, 130, false, line);
            for (int i = 0; i < 4; i++) {
                double angle = Math.toRadians(i * 90d);
                float x = cx + (float) Math.cos(angle) * radius * .73f;
                float y = cy + (float) Math.sin(angle) * radius * .73f;
                core.setColor(0xFF9A8CFF);
                canvas.drawCircle(x, y, radius * .055f, core);
            }
            canvas.restore();

            diamond.reset();
            diamond.moveTo(cx, cy - radius * .55f);
            diamond.lineTo(cx + radius * .55f, cy);
            diamond.lineTo(cx, cy + radius * .55f);
            diamond.lineTo(cx - radius * .55f, cy);
            diamond.close();
            line.setColor(0xFFE8C77C);
            line.setStrokeWidth(Math.max(2f, radius * .035f));
            canvas.drawPath(diamond, line);

            core.setColor(0xFFEEE5FF);
            core.setShadowLayer(radius * .20f, 0, 0, 0xCC9A8CFF);
            canvas.drawCircle(cx, cy, radius * .12f, core);
            core.clearShadowLayer();
            core.setColor(0xFF9A8CFF);
            canvas.drawCircle(cx, cy, radius * .06f, core);
        }
    }
}
