# Alergia × medicamento: tabela, decisões e fontes

Código: `admin/modules/patients/record/allergyConflict.js`. Montada em 26/10/2026. O sistema **avisa e nunca bloqueia** (só a prescrição pede a marca "conferi"). Sem aviso não significa seguro: só os nomes abaixo são reconhecidos. Revisão final: médico responsável.

## O que a tabela faz hoje

| Regra | Termos | Sentido |
|---|---|---|
| Dipirona (inclui associações) | dipirona, metamizol, Novalgina, Anador, Magnopyrol, Conmel, Neosaldina, Dorflex, Lisador, Buscopan Composto | os dois sentidos |
| Penicilinas | penicilina, amoxicilina, ampicilina, benzilpenicilina, oxacilina, piperacilina, Amoxil, clavulanato, Augmentin | os dois sentidos |
| Penicilina → cefalosporinas de cadeia lateral parecida | cefalexina, cefadroxila, cefaclor | só de penicilina/amoxicilina/ampicilina para elas |
| Cefalosporinas | cefalexina, cefazolina, cefuroxima, ceftriaxona, cefadroxila, cefepima | os dois sentidos entre si |
| Sulfonamidas antibióticas | sulfa, sulfonamida, sulfametoxazol, cotrimoxazol, Bactrim, sulfadiazina | os dois sentidos; "sulfa" só vale como palavra inteira (sulfato ferroso não avisa) |
| Trimetoprima | trimetoprima → Bactrim, cotrimoxazol | só nesse sentido: sulfa não avisa para trimetoprima isolada |
| Anticonvulsivantes aromáticos | carbamazepina (Tegretol), oxcarbazepina (Trileptal), fenitoína (Hidantal), fenobarbital (Gardenal), primidona, lamotrigina (Lamictal), zonisamida, felbamato | os dois sentidos |
| Inibidores fortes da COX-1 | AAS, aspirina, ácido acetilsalicílico, Melhoral, Somalgin, Cafiaspirina, ibuprofeno, naproxeno, diclofenaco, cetoprofeno, cetorolaco, piroxicam e marcas (Advil, Alivium, Dalsy, Cataflam, Voltaren, Naprosyn) | os dois sentidos entre si |
| Classe "AINE" digitada na alergia | os da linha acima, nimesulida, meloxicam, celecoxibe, etoricoxibe | só de AINE para eles |

**Não avisam de propósito:** dipirona ↔ AINEs; paracetamol; sulfonamidas não antibióticas (furosemida, hidroclorotiazida, celecoxibe, topiramato); levetiracetam e valproato; cefazolina, ceftriaxona e cefuroxima para quem tem alergia a penicilina.

## Decisões e a evidência

1. **Marcas.** Conferidas em bulas: Somalgin (Cardio) é ácido acetilsalicílico tamponado; Conmel, Anador, Magnopyrol são dipirona; Dorflex (dipirona 300 mg + orfenadrina + cafeína), Lisador (dipirona + prometazina + adifenina), Buscopan Composto (butilescopolamina + dipirona) e Neosaldina (dipirona + isometepteno + cafeína) contêm dipirona; Cafiaspirina (AAS 650 mg + cafeína) e Melhoral (AAS 500 mg + cafeína) são AAS. Tegretol é carbamazepina e Lamictal é lamotrigina (bula). Trileptal, Hidantal e Gardenal foram incluídos por conhecimento geral: a busca não os confirmou.
2. **Trimetoprima.** Não é sulfonamida, então sulfa não avisa para ela. Mas dá reação própria, e quem reage ao cotrimoxazol deve evitar os dois componentes: alergia a trimetoprima avisa para Bactrim e cotrimoxazol.
3. **Reações cruzadas.**
   - *Penicilina → cefalosporina:* o risco depende da cadeia lateral R1, não do anel; cefazolina tem cadeia diferente. Pares com cadeia parecida e dados limitados: amoxicilina–cefadroxila e ampicilina–cefalexina. Por isso só essas (e cefaclor) avisam.
   - *Sulfa antibiótica → não antibióticas:* risco não aumenta de forma relevante; não avisa.
   - *AAS ↔ AINEs:* a reação "cruzada" (COX-1) afeta a maioria dos que reagem a mais de um AINE; a "seletiva" (um só fármaco, típica de pirazolonas como a dipirona) não cruza. A ficha não guarda o tipo da reação, então os inibidores fortes da COX-1 avisam entre si e a dipirona fica de fora. Uma parte dos pacientes asmáticos reage à dipirona como à aspirina: decisão clínica.
4. **Anticonvulsivantes.** Reação cruzada entre carbamazepina, oxcarbazepina, fenitoína e fenobarbital em 40 a 80% dos estudos; a lamotrigina cruza menos (17% contra 27–35% em uma coorte), mas entra por prudência. Levetiracetam e valproato são as alternativas usuais e não avisam, embora existam relatos raros de recaída de DRESS com eles.
5. **Celecoxibe e etoricoxibe.** Tolerados pela maioria (94,9% em desafio com 309 pacientes), mas não por todos e só testados sob supervisão: mantidos no aviso da classe AINE.
6. **Política.** Avisar, nunca bloquear; aviso falso custa um clique.
7. **Texto quando nada bate:** "Sem correspondência automática. A checagem só reconhece nomes e marcas conhecidos: confira o medicamento."

## Limites desta pesquisa

Busca web em fontes secundárias (revisões, bulas reproduzidas por farmácias, resumos do Drug Allergy Practice Parameter 2022); o texto integral das diretrizes não foi lido. Bulas de farmácia podem divergir do bulário oficial da Anvisa. Isto é apoio à decisão do médico, não a substitui.

## Fontes

- Bulas: [Somalgin Cardio](https://bula.com.br/original/somalgin-cardio) · [Conmel](https://bula.com.br/original/conmel-comprimido) · [Dorflex](https://www.bulas.med.br/p/bulas-de-medicamentos/bula/1332728/dorflex-comprimido.htm) · [Lisador](https://www.araujo.com.br/bula/Lisador-com-24-Comprimidos) · [Buscopan Composto](https://bula.com.br/buscopan-composto) · [Neosaldina](https://bula.com.br/neosaldina/composicao) · [Cafiaspirina](https://bula.com.br/cafiaspirina) · [Melhoral](https://bula.com.br/melhoral) · [Magnopyrol](https://bula.com.br/original/magnopyrol-comprimidos) · [Anador](https://www.bulas.med.br/p/bulas-de-medicamentos/bula/1931/anador-comprimido.htm) · [Tegretol](https://www.araujo.com.br/bula/Tegretol-200mg-com-60-Comprimidos) · [Lamictal](https://www.araujo.com.br/bula/Lamictal-25mg-com-30-Comprimidos)
- Penicilina e cefalosporina: [revisão do Practice Parameter 2022 (PMC11609518)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11609518) · [Jeffres 2025, cadeias laterais](https://www.idstewardship.com/wp-content/uploads/2017/06/Beta-lactam-side-chain-handout-6.26.2025.pdf)
- Sulfonamidas: [Cleveland Clinic J Med 2025](https://www.ccjm.org/content/92/3/147) · [Practice Parameter 2022 (Khan et al.)](https://pubmed.ncbi.nlm.nih.gov/36563781/) · [GP Notebook](https://gpnotebook.com/pages/immunology/choosing-medicines-in-sulfonamide-hypersensitivity)
- AINEs: [classificação EAACI/ENDA, coorte dinamarquesa](https://pmc.ncbi.nlm.nih.gov/articles/PMC4355575) · [reações seletivas à dipirona (Ariza 2016)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4814906) · [Frontiers in Pharmacology 2020](https://www.frontiersin.org/articles/10.3389/fphar.2020.00503/pdf) · [tolerância ao celecoxibe](https://karger.com/iaa/article/137/2/145/164973/Celecoxib-Tolerability-in-Patients-with)
- Anticonvulsivantes: [Altmeyers](https://altmeyers.org/en/allergology/antiepileptic-drug-hypersensitivity-135576) · [lamotrigina e aromáticos (AES)](https://aesnet.org/abstractslisting/the-cross-reactivity-between-lamotrigine-and-other-aromatic-anticonvulsants-) · [DRESS e levetiracetam](https://www.elsevier.es/en-revista-neurologia-english-edition--495-pdf-download-S2173580825000252)
