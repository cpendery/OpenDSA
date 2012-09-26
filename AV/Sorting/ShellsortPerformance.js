"use strict";
/*global alert*/
(function ($) {
  // Create the AV object. We turn off slideshow mode, since this is a
  // "static" form-based activity
  var av = new JSAV("ssperform", {'animationMode': 'none'});

  // Define the local context (from form name)
  //containing HTML elements within id ssperform.
  var context = $("#ssperform");

  // Create a convenience function named tell for writing to output
  var tell = function (msg, color) { av.umsg(msg, {color: color}); };

  // The permanent array of numbers.
  // This is "permanent" in that we want to use the same values
  // each time that we sort, so that we can compare costs.
  // It only changes when the user re-sets the array size, at which
  // time a new set of random numbers is drawn.
  var theArray = [];

  var ASize = $('input[name="arraysize"]', context).val(); // Array size

  var Comps; // Count for comparisions
  var Swaps; // Count for swaps

  // True if we already printed baseline info;
  // False means to print it out again and toggle
  var InitFlag = false;

  // Process About button: Pop up a message with an Alert
  function about() {
    alert("Shellsort Performance Activity\nWritten by Cliff Shaffer and Ville Karavirta\nCreated as part of the OpenDSA hypertextbook project\nFor more information, see http://algoviz.org/OpenDSA\nSource and development history available at\nhttps://github.com/cashaffer/OpenDSA\nCompiled with JSAV library version " + JSAV.version());
  }

  // Process clear button: Clear the output textbox
  function Clear() {
    av.clearumsg();
    InitFlag = false;
  }

  // Initialize theArray to be size random numbers
  function initArray(size) {
    var i;
    theArray.length = 0; // Out with the old
    // Give random numbers in range 0..9999
    for (i = 0; i < size; i++) {
      theArray[i] = Math.floor(Math.random() * 10000);
    }
    ASize = size;
  }

  // Change the array size
  function Change() {
    // Validate arraysize
    var newVal = Number($('input[name="arraysize"]', context).val());
    if (isNaN(newVal) || (newVal < 1) || (newVal > 10000)) {
      alert("List size has to be a positive number less than 10000");
      return;
    }
    if (newVal !== ASize) {
      ASize = newVal;
      InitFlag = false;
      initArray(ASize);
    }
  }

  // Swap two elements of an array
  function swap(A, i, j) {
    var temp = A[i];
    A[i] = A[j];
    A[j] = temp;
  }

  // Do an incremental insertion sort
  function insertionSort(A, start, incr) {
    var i, j;
    for (i = start + incr; i < A.length; i += incr) {
      for (j = i; (j >= incr) && (A[j] < A[j - incr]); j -= incr) {
        Comps += 1;
        Swaps += 1;
        swap(A, j, j - incr);
      }
      if (j >= incr) { Comps += 1; }
    }
  }

  // Verify that the array really is sorted
  function checkArray(A) {
    var i;
    for (i = 1; i < A.length; i++) {
      if (A[i] < A[i - 1]) {
        alert("Sort algorithm failed!");
        return;
      }
    }
  }
    
  // Validate the increment series
  function checkIncrements() {
    var i,
      num,
      prev = Number.MAX_VALUE,
      msg = "Increments sequence must be decreasing positive values ending with 1";
    // Convert user's increments to an array,
    var incrs = $('input[name="increments"]', context).val().match(/[0-9]+/g) || [];
    for (i = 0; i < incrs.length; i++) {
      incrs[i] = Number(incrs[i]);
      if (isNaN(incrs[i]) || incrs[i] < 0 || incrs[i] > prev) {
        alert(msg);
        return null;
      }
      prev = incrs[i];
    }
    if (incrs[incrs.length - 1] !== 1) {
      alert(msg);
      return null;
    }
    return incrs;
  }

  // Main action: Result of clicking "Run" button
  function RunIt() {
    var i, j;
    var incr, curr;
    var tempArray = []; // This is the working copy of the array

    // Validate the user's increments
    var incrs = checkIncrements();
    if (!incrs) { return; }

    // This should only happen the very first time we run
    if (theArray.length !== ASize) { initArray(ASize); }

    if (!InitFlag) {
      tell("For list size of: " + ASize + "\n", "blue");
      // First we run a standard insertion sort
      // Copy to the working array
      tempArray = theArray.slice(0);
      Comps = 0;
      Swaps = 0;
      insertionSort(tempArray, 0, 1);
      checkArray(tempArray);
      tell("\nStraight Insertion Sort needs " + Comps +
           " comparisons and " + Swaps + " swaps\n");

      // Next we do the "divide by twos" series
      // Copy to the working array
      tempArray = theArray.slice(0);
      Comps = 0;
      Swaps = 0;
      j = 1;
      while (j * 2 < ASize) { j = j * 2; }
      for (incr = j; incr >= 1; incr = incr / 2) {
        for (curr = 0; curr < incr; curr++) {
          insertionSort(tempArray, curr, incr);
        }
      }
      checkArray(tempArray);
      tell("Divide by twos sequence needs " + Comps +
           " comparisons and " + Swaps + " swaps\n");
      InitFlag = true;
    }

    // Now we are ready to run the user's series
    // Copy to the working array
    tempArray = theArray.slice(0);
    Comps = 0;
    Swaps = 0;
    for (i = 0; i < incrs.length; i += 1) {
      for (curr = 0; curr < incrs[i]; curr++) {
        insertionSort(tempArray, curr, incrs[i]);
      }
    }
    checkArray(tempArray);
    tell("The sequence " + $('input[name="increments"]', context).val() +
         " needs " + Comps +
         " comparisons and " + Swaps + " swaps\n");
  }

  // Action callbacks to the various HTML entities.
  $('input[name="about"]').click(about);
  $('input[name="run"]', context).click(RunIt);
  $('input[name="clear"]', context).click(Clear);
  $('input[name="arraysize"]', context).focusout(Change);
  $('input[name="increments"]', context).focusout(checkIncrements);

}(jQuery));
