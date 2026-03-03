# Suufungo no Mirai ga Wakaru You ni Natta kedo, Onnagokoro wa Wakaranai.

> Arase Itou bisa melihat beberapa menit ke depan. Namun, masa depan yang ia lihat selalu berhubungan dengan masalah. Arase yang baik hati berusaha menghindari masa depan yang tidak menyenangkan ini, namun pada akhirnya masalah tersebut tetap membuatnya membantu berbagai gadis dengan masalah mereka. Tanpa ia sadari, para gadis mulai menyukainya. Arase tidak menyadari bahwa, diam-diam, para gadis bersaing untuk memperebutkannya.

---

## Info

| | |
|---|---|
| Judul | Suufungo no Mirai ga Wakaru You ni Natta kedo, Onnagokoro wa Wakaranai. |
| Judul Alternatif | 数分後の未来が分かるようになったけど、女心は分からない。 |
| Author | MTY |
| Artist | You2 |
| Tipe | Manga (Hitam Putih) |
| Status | Ongoing |
| Genre | Shounen · Drama · Harem · Comedy · Romance · Supernatural · School Life · Slice of Life |
| Chapter | 27 chapter |

## Link

- [MangaDex](https://mangadex.org/title/16c34950-954c-4f0d-808e-d8278a546339/suufungo-no-mirai-ga-wakaru-you-ni-natta-kedo-onnagokoro-wa-wakaranai)
- [Raw](https://comic-walker.com/detail/KC_005690_S)

---

## Struktur

```
SuufungonoMirai/
├── manga-config.json     # Metadata manga
├── manga.json            # Data chapter (auto-generated)
├── manga-automation.js   # Script automation
├── encrypt-manifest.js   # Script enkripsi manifest
├── daily-views.json      # Data views harian
└── <chapter>/
    └── manifest.json     # Daftar halaman (encrypted)
```

## Automation

Semua proses berjalan otomatis via GitHub Actions:

1. Push chapter baru (folder + manifest.json)
2. `encrypt-manifest.yml` — enkripsi manifest
3. `manga-automation.yml` — regenerate manga.json
4. Trigger rebuild ke website utama
5. `sync-cover.yml` — sinkronisasi cover dari website

---

Bagian dari [Nurananto Scanlation](https://nuranantoscans.my.id)