function createChairModel() {
  const objectParts = [];
  const C_WOOD = vec4(0.6, 0.4, 0.2, 1.0); // Darker Wood Color

  function part(t, c) {
    objectParts.push({ transform: t, color: c });
  }

  const legW = 0.15,
    legH = 1.5,
    legD = 0.15;
  const seatW = 1.4,
    seatH = 0.1,
    seatD = 1.5;
  const backrestW = 1.5,
    backrestH = 0.75,
    backrestD = 0.1;
  const armrestW = 0.15,
    armrestH = 0.1,
    armrestD = 1.4;
  const tabletW = 0.5,
    tabletH = 0.1,
    tabletD = 0.7;
  const shelfW = 1.4,
    shelfH = 0.07,
    shelfD = 0.6;

  // Kaki kursi
  part(mult(translate(-0.6, -0.8, 0.6), scale(legW, legH, legD)), C_WOOD);
  part(mult(translate(0.45, -0.8, 0.6), scale(legW, legH, legD)), C_WOOD);
  part(
    mult(translate(-0.6, -0.35, -0.6), scale(legW, legH + 0.95, legD)),
    C_WOOD
  );
  part(
    mult(translate(0.45, -0.35, -0.6), scale(legW, legH + 0.95, legD)),
    C_WOOD
  );

  // Dudukan kursi (4 wide planks, rotated)
  for (let i = 0; i < 4; i++) {
    part(
      mult(
        mult(translate(0.37 - i * 0.3, -0.6, 0), rotateY(90)),
        scale(seatW, seatH, 0.25)
      ),
      C_WOOD
    );
  }

  // Sandaran kursi (4 wide planks)
  for (let i = 0; i < 4; i++) {
    part(
      mult(
        translate(-0.55 + i * 0.3, 0.5, -0.5),
        scale(0.2, backrestH, backrestD)
      ),
      C_WOOD
    );
  }

  // Lengan kursi
  part(
    mult(translate(-0.6, 0, 0.15), scale(armrestW, armrestH, armrestD)),
    C_WOOD
  );
  part(
    mult(translate(0.45, 0, 0.15), scale(armrestW, armrestH, armrestD)),
    C_WOOD
  );

  // Batas shelf Belakang
  part(mult(translate(-0.1, -1.2, -0.65), scale(1, 0.13, 0.1)), C_WOOD);
  // Batas shelf Depan
  part(mult(translate(-0.1, -1.2, 0.65), scale(1, 0.13, 0.1)), C_WOOD);

  // Batas Seat Belakang
  part(mult(translate(-0.1, -0.65, -0.65), scale(1, 0.13, 0.1)), C_WOOD);
  // Batas Seat Depan
  part(mult(translate(-0.1, -0.65, 0.65), scale(1, 0.13, 0.1)), C_WOOD);

  // Batas Sandaran atas
  part(mult(translate(-0.1, 0.7, -0.65), scale(1, 0.13, 0.1)), C_WOOD);

  // Batas Sandaran bawah
  part(mult(translate(-0.1, 0.3, -0.65), scale(1, 0.13, 0.1)), C_WOOD);

  // Meja kecil
  part(mult(translate(-0.4, 0, 0.5), scale(tabletW, tabletH, tabletD)), C_WOOD);

  // Rak bawah (4 wide planks, rotated)
  for (let i = 0; i < 5; i++) {
    part(
      mult(
        mult(translate(0.34 - i * 0.2, -1.2, 0), rotateY(90)),
        scale(shelfW, shelfH, 0.15)
      ),
      C_WOOD
    );
  }

  return objectParts;
}

function createTableModel() {
  const objectParts = [];
  const C_TABLE = vec4(0.4, 0.25, 0.15, 1.0);
  const C_TABLE2 = vec4(0.2, 0.15, 0.1, 1.0); // Warna Kayu Gelap
  function part(t, c) {
    objectParts.push({ transform: t, color: c });
  }
  part(mult(translate(0, 1.0, 0), scale(3.0, 0.4, 3.0)), C_TABLE);
  part(mult(translate(0, 1.20, 0), scale(0.5, 0.02, 0.5)), C_TABLE2);
  part(mult(translate(0, 0, 0), scale(0.7, 2.0, 0.7)), C_TABLE);
  part(mult(translate(0, -0.55, 0), scale(0.8, 0.15, 0.15)), C_TABLE2);
  part(mult(translate(0, -0.55, 0), scale(0.15, 0.15, 0.8)), C_TABLE2);
  part(mult(translate(0, -0.8, 0), scale(1, 0.1, 1.1)), C_TABLE2);
  part(mult(translate(0, -0.25, 0), scale(0.72, 0.12, 0.72)), C_TABLE2);
  part(mult(translate(0, -0.1, 0), scale(0.72, 0.12, 0.72)), C_TABLE2);
  part(mult(translate(0, 0.05, 0), scale(0.72, 0.12, 0.72)), C_TABLE2);
  part(mult(translate(0, 0.2, 0), scale(0.72, 0.12, 0.72)), C_TABLE2);
  part(mult(translate(0, 0.35, 0), scale(0.72, 0.12, 0.72)), C_TABLE2);
  part(mult(translate(0, -1.0, 0), scale(1.3, 0.4, 1.6)), C_TABLE);

  return objectParts;
}

window.createChairModel = createChairModel;
window.createTableModel = createTableModel;
