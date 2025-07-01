# Nexora Backend

Bu proje, Nexora e-ticaret platformunun Node.js, Express ve PostgreSQL kullanılarak oluşturulmuş sunucu tarafı uygulamasıdır.

## Teknolojiler

-   **Framework**: Express.js
-   **Veritabanı**: PostgreSQL
-   **Kimlik Doğrulama**: JSON Web Tokens (JWT)
-   **Şifreleme**: Bcrypt.js
-   **ORM/Veritabanı İstemcisi**: node-postgres (pg)

## Özellikler

-   **Üye Yönetimi**: Kayıt, giriş, profil görüntüleme ve güncelleme.
-   **Ürün Yönetimi**: Ürün, kategori ve marka için tam CRUD (Oluşturma, Okuma, Güncelleme, Silme) işlemleri.
-   **Sepet İşlemleri**: Sepete ürün ekleme, sepeti görüntüleme, ürün adedini güncelleme ve sepetten ürün silme.
-   **Sipariş Yönetimi**: Sepetten sipariş oluşturma, kullanıcının siparişlerini listeleme ve sipariş detaylarını görüntüleme.
-   **Adres Yönetimi**: Kullanıcı profiline bağlı adres ekleme, güncelleme ve silme.
-   **Yorum ve Puanlama**: Ürünlere yorum yapma ve puan verme.
-   **Favori Ürünler**: Kullanıcıların favori ürünlerini yönetmesi.
-   **Vitrin Yönetimi**: Ana sayfada gösterilecek ürünleri belirleme.

## Kurulum ve Başlatma

1.  **Bağımlılıkları Yükleyin:**
    ```sh
    npm install
    ```
2.  **Ortam Değişkenlerini Ayarlayın:**
    Proje kök dizininde bir `.env` dosyası oluşturun ve aşağıdaki değişkenleri kendi PostgreSQL veritabanı bilgilerinizle doldurun.
    ```env
    DB_USER=your_db_user
    DB_HOST=localhost
    DB_DATABASE=your_db_name
    DB_PASSWORD=your_db_password
    DB_PORT=5432
    JWT_SECRET=your_jwt_secret_key
    ```
3.  **Sunucuyu Başlatın:**
    ```sh
    node server.js
    ```
    Sunucu varsayılan olarak `http://localhost:3000` adresinde çalışmaya başlayacaktır.
