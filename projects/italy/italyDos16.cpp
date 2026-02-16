#include <dos.h>     // MK_FP, int86, delay
#include <stdint.h>  // uint8_t, uint16_t

// Segmento memoria video modalità testo
#define VIDEO_SEG 0xB800
#define SCREEN_W 80
#define SCREEN_H 50   // modalità 80x50 caratteri

// Funzione per scrivere un carattere con colore (colore = fg + bg*16)
void putch_xy(int x, int y, char ch, uint8_t color) {
    uint16_t far* screen = (uint16_t far*) MK_FP(VIDEO_SEG, 0);
    screen[y * SCREEN_W + x] = (color << 8) | ch;
}

// Pulisce lo schermo con un colore di sfondo
void clear_screen(uint8_t color) {
    for (int y = 0; y < SCREEN_H; y++) {
        for (int x = 0; x < SCREEN_W; x++) {
            putch_xy(x, y, ' ', color);
        }
    }
}

// Mappa Italia (80x50)
const char *italy[50] = {
"                                                                                 ",
"                                                                                 ",
"                                #######                                          ",
"                            ####      ##                                         ",
"                          ##               ####                                  ",
"               ##    ######                  #                                   ",
"              #  ## #                        ##                                  ",
"        #### #     ##                        ##                                  ",
"       ##                                 ##  ##                                 ",
"        ##                             ###                                       ",
"         #                            #                                          ",
"      ##                               #                                         ",
"        #                              #                                         ",
"        #                             #                                          ",
"        #         ###                 #                                          ",
"         #      #     ##               #                                         ",
"           ## ##         ##            ###                                       ",
"           ##              #               ##                                    ",
"                           #                 ##                                  ",
"                            #                 #                                  ",
"                            #                  #                                 ",
"                             ##                 #                                ",
"                               #                #                                ",
"                                #                ##                              ",
"                                   #               ##                            ",
"                                    #                ##                          ",
"                                      #                     #                    ",
"                                       ##                  #                     ",
"                                          #                  ##                  ",
"               ##  ## ##                       #                ###              ",
"               ####    #                        ##                  #            ",
"               #        #                         ####                ##         ",
"                #       #                            #          ####    #        ",
"                #      #                              ##       #      #  #       ",
"                ##      #                                ##    #       ###       ",
"                 #      #                                      #                 ",
"                #      #                                   #     #               ",
"                #   #  #                                    #     #              ",
"                ## #                                        #     #              ",
"                                                            #  #                 ",
"                                                           #  #                  ",
"                                                        ###  ##                  ",
"                                        ###  ## #####   ### #                    ",
"                                       #               #                         ",
"                                        ###            #                         ",
"                                            ##         #                         ",
"                                               ###     #                         ",
"                                     #             #  ##                         ",
"                                                                                ",
"                                                                                "
};

// Imposta modalità VGA 80x50 (font 8x8)
void set80x50() {
    union REGS regs;
    regs.h.ah = 0x00; regs.h.al = 0x03;   // reset 80x25
    int86(0x10, &regs, &regs);
    regs.h.ah = 0x11; regs.h.al = 0x12; regs.h.bl = 0x00; // font 8x8
    int86(0x10, &regs, &regs);
}

// Stampa con effetto typing SOLO sui #
void drawMapTyping(int delay_ms) {
    for (int y = 0; y < 50; y++) {
        uint8_t color;
        if (y < 16)        color = 0x0A; // verde chiaro
        else if (y < 32)   color = 0x0F; // bianco brillante
        else               color = 0x0C; // rosso chiaro

        for (int x = 0; x < 80; x++) {
            if (italy[y][x] == '#') {
                putch_xy(x, y, '#', color);
                delay(delay_ms);           // effetto typing solo sulla mappa
            } else {
                putch_xy(x, y, ' ', 0x00); // sfondo nero
            }
        }
    }
}

int main() {
    set80x50();
    clear_screen(0x00);   // sfondo nero
    drawMapTyping(20);    // effetto typing

    // aspetta ESC (ASCII 27) prima di uscire
    union REGS regs;
    do {
        regs.h.ah = 0x00; // BIOS keyboard service: read key
        int86(0x16, &regs, &regs);
    } while (regs.h.al != 27);

    return 0;
}
