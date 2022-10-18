// Computer Remote Control - 2022
// Github: @hizbi-github
// Author: Hizbullah Khan
// License: MIT

#include "stdio.h"
#include "stdlib.h"
#include "windows.h"
//#include "winuser.h"

//VK_LEFT 0x25
//VK_RIGHT 0x27
//VK_UP 0x26
//VK_DOWN 0x28

void emulateKeyboardInput(unsigned short keyboardInput);

int main(int argc, char *argv[])
{
    //Sleep(2000);
    unsigned short inputString = atoi(argv[1]);
    //printf("%hi", inputString);    
    emulateKeyboardInput(inputString);
    printf("Success");    
    return(0);
}

void emulateKeyboardInput(unsigned short keyboardInput)
{
    INPUT inputs[2] = {};
    ZeroMemory(inputs, sizeof(inputs));

    inputs[0].type = INPUT_KEYBOARD;
    inputs[0].ki.wVk = keyboardInput;
    SendInput(1, &inputs[0], sizeof(INPUT));

    inputs[1].type = INPUT_KEYBOARD;
    inputs[1].ki.wVk = keyboardInput;
    inputs[1].ki.dwFlags = KEYEVENTF_KEYUP;
    SendInput(1, &inputs[1], sizeof(INPUT));

    //UINT uSent = SendInput(ARRAYSIZE(inputs), inputs, sizeof(INPUT));
}




    //printf("\n %c Input Emulated! \n", keyboardInput);

    //if (uSent != ARRAYSIZE(inputs))
    //{
    //    printf("Error: ");
    //    printf(HRESULT_FROM_WIN32(GetLastError()));
    //} 